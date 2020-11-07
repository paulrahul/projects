#include "stats_server.h"

#include <iostream>

#include <grpcpp/grpcpp.h>


using grpc::InsecureServerCredentials;
using grpc::ServerAsyncResponseWriter;
using grpc::ServerBuilder;

using namespace std;

StatsServerImpl::StatsServerImpl()
    : async_service_(new FocusStatsService::AsyncService()) {
}

Status StatsServerImpl::FocusWrite(
    ServerContext* context, const FocusWriteRequest* request,
    FocusWriteResponse* response) {
    cout << request->request_id() << endl;
    response->set_request_id(request->request_id());

    return Status::OK;
}

void StatsServerImpl::HandleRpcs() {
    ServerContext context;
    FocusWriteRequest req;
    ServerAsyncResponseWriter<FocusWriteResponse> responder(&context);
    async_service_->RequestFocusWrite(
        &context, &req, &responder, cq_.get(), cq_.get(), (void*)1);

    FocusWriteResponse res;
    Status status;
    void* got_tag;
    bool ok = false;
    
    if (cq_->Next(&got_tag, &ok)) {
        if (got_tag != (void*)1) {
            cout << "Unexpected tag obtained: " << got_tag << endl;
            responder.Finish(res, Status::CANCELLED, (void*)2);
        }

        if (!ok) {
            cout << "Completion Queue check unsuccessful" << endl;
            responder.Finish(res, Status::CANCELLED, (void*)2);
        }

        if (ok && got_tag == (void*)1) {
            cout << "Received a request from client: "
                 << req.ShortDebugString() << endl;
            res.set_request_id(req.request_id());
            status = Status::OK;

            responder.Finish(res, status, (void*)2);
        }
    }

    if (cq_->Next(&got_tag, &ok)) {
        cout << "Tag: " << got_tag << endl;
        cout << "Shutting down server. " << endl;
        server_->Shutdown();
        cq_->Shutdown();
    }
}

void StatsServerImpl::Run() {
    const string& port = "50051";
    ServerBuilder builder;

    builder.AddListeningPort("0.0.0.0:" + port,
                             InsecureServerCredentials());
    builder.RegisterService(async_service_.get());
    cq_ = builder.AddCompletionQueue();
    server_ = builder.BuildAndStart();

    cout << "Server started on port " << port << endl;

    HandleRpcs();
}

void RunServer() {
    const string& port = "50051";
    StatsServerImpl sync_service;
    ServerBuilder builder;

    builder.AddListeningPort("0.0.0.0:" + port,
                             InsecureServerCredentials());
    builder.RegisterService(&sync_service);
    //cq_ = builder_.AddCompletionQueue();
    auto server = builder.BuildAndStart();

    cout << "Server started on port " << port << endl;

    server->Wait();
}

int main() {
    // RunServer();
    StatsServerImpl server;
    server.Run();

    cout << "Exiting main in server." << endl;

    return 0;
}
