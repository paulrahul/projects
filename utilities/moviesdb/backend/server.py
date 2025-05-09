'''
~/Codez/projects/utilities/moviesdb: uvicorn backend.server:app --reload
'''

import threading
import schedule
import time
import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from langchain_experimental.agents import create_pandas_dataframe_agent
from langchain.prompts import MessagesPlaceholder, SystemMessagePromptTemplate
from langchain.prompts.chat import ChatPromptTemplate
from langchain.agents.agent_types import AgentType
from langchain_core.messages import SystemMessage
from langchain_core.messages import AIMessage
from langchain_core.output_parsers import JsonOutputParser


import pandas as pd
import pickle
import os
import logging
from backend.criterion.extractor import CriterionDataCollector
from backend.criterion.keywords import update_preprocessed_data
from backend.util import resolved_file_path

log = logging.getLogger()
# Configure logging to show messages in the console
logging.basicConfig(
    format="%(asctime)s - %(levelname)s - %(message)s",
    level=logging.INFO  # Set the logging level to INFO
)
log = logging.getLogger(__name__)  # Ensure log instance is properly configured

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ServerState:
    INITIALIZING = "initializing"
    UPDATING = "updating"
    READY = "ready"

state = {"status": ServerState.INITIALIZING}
agent_executor = None
collector = CriterionDataCollector(max_movies=2000, max_workers=5, request_delay=1)

PICKLE_FILE = resolved_file_path("dataframe.pkl")
CSV_FILE = resolved_file_path("criterion/preprocessed.csv")

# **Locks for Synchronization**
df_update_lock = threading.Lock()  # Ensures `update_dataframe` runs exclusively
reader_count_lock = threading.Lock()  # Protects access to `reader_count`
update_condition = threading.Condition()  # Prevents starvation

reader_count = 0  # Tracks active `process_prompt` calls

def load_dataframe():
    log.info("Updating closet database...")
    log.info("Collecting data...")
    updated = collector.collect_data()
    
    if updated or not os.path.exists(PICKLE_FILE):
        log.info("Updating preprocessed data...")
        update_preprocessed_data()
        log.info("Loading new DataFrame from preprocessed CSV")
        df = pd.read_csv(CSV_FILE, on_bad_lines='warn')
        with open(PICKLE_FILE, "wb") as f:
            pickle.dump(df, f)
        return df
    elif os.path.exists(PICKLE_FILE):
        log.info("Loading DataFrame from pickle file")
        with open(PICKLE_FILE, "rb") as f:
            return pickle.load(f)
    else:
        raise Exception("Neither pickle nor CSV file exists.")

def update_dataframe():
    global agent_executor

    with df_update_lock:
        # Ensure no readers are accessing `agent_executor`
        with update_condition:
            while reader_count > 0:
                update_condition.wait()  # Wait until all `process_prompt` calls finish
            log.info("Updating dataframe...")
            state["status"] = ServerState.UPDATING
            
            # Your system prompt
            # system_message = """You are an experienced data science engineer having expertise in movies from around the world, especially Criterion collection movies. Use the provided CSV for getting answers to Criterion recommendations queries. Whenever your response has a name(s) of movies, make sure you list the movie(s) separately in this format: movie name, movie url, thumbnail"""
            
            # system_message = SystemMessage(content="""You are an experienced data science engineer having expertise in movies from around the world, especially Criterion collection movies. Use the provided CSV for getting answers to Criterion recommendations queries. Whenever your response has a name(s) of movies, make sure you list the movie(s) separately in this format: movie name, movie url, thumbnail""")
            
            
            # # Optional: Create a custom chat prompt with system role
            # custom_prompt = ChatPromptTemplate.from_messages([
            #     SystemMessagePromptTemplate.from_template(system_prompt),
            #     MessagesPlaceholder(variable_name="chat_history"),
            # ])

            df = load_dataframe()
            llm = ChatOpenAI(
                model="gpt-3.5-turbo",
                temperature=0
                # prefix=system_message
                # model_kwargs={
                #     "prefix": system_message,
                #     # "default_messages": [system_message]
                # }
            )

            agent_executor = create_pandas_dataframe_agent(
                llm,
                df,
                verbose=True,
                allow_dangerous_code=True,
                agent_type=AgentType.OPENAI_FUNCTIONS  # Make sure to use this agent type for better compatibility
            )
            
            # agent_executor.agent.llm_chain.prompt = custom_prompt

            state["status"] = ServerState.READY
            log.info("Dataframe updated")

# Load the CSV and create the LangChain agent in a separate thread
def initialize_agent():
    log.info("Starting server...")
    try:
        update_dataframe()
        log.info("Server started and ready to serve requests")
    except Exception as e:
        log.error("Failed to initialize agent: %s", e)
        state["status"] = "error"

thread = threading.Thread(target=initialize_agent)
thread.start()

class PromptRequest(BaseModel):
    prompt: str

@app.get("/status")
def get_status():
    return {"status": state["status"]}

message_template = """You are an experienced data science engineer having expertise in movies from around the world, especially Criterion collection movies. Use the provided CSV for getting answers to Criterion recommendations queries. 

Your response should be in a valid JSON format. If your response has a name(s) of movies, make sure you list the movie(s) separately in a JSON array field called 'movies' with each element having keys: movie name, movie url, thumbnail. You must always return valid JSON fenced by a markdown code block. Do not return any additional text.

My query is: {query}
"""

@app.post("/prompt")
def process_prompt(request: PromptRequest):
    global reader_count
    if state["status"] == ServerState.INITIALIZING:
        raise HTTPException(status_code=503, detail="Server is not ready")

    with reader_count_lock:
        reader_count += 1  # Increment active reader count

    try:
        response = agent_executor.invoke(message_template.format(query=request.prompt), handle_parsing_errors=True)
        return {"response": response["output"]}
    except Exception as e:
        log.error("Error processing prompt: %s", e)
        raise HTTPException(status_code=500, detail="Error processing prompt")
    finally:
        with reader_count_lock:
            reader_count -= 1  # Decrement reader count
            if reader_count == 0:
                with update_condition:
                    update_condition.notify_all()  # Notify `update_dataframe` to proceed if waiting

# **Scheduled Execution of `update_dataframe`**
def schedule_update():
    while True:
        schedule.run_pending()
        time.sleep(1)  # Small delay to prevent busy-waiting

# Schedule `update_dataframe` at 2 AM daily
schedule.every().day.at("02:00").do(lambda: threading.Thread(target=update_dataframe).start())

# # Run the scheduling thread
schedule_thread = threading.Thread(target=schedule_update, daemon=True)
schedule_thread.start()
