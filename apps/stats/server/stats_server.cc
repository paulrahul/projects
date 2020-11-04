#include "stats_server.h"

#include <iostream>

#include <grpcpp/grpcpp.h>


using grpc::InsecureServerCredentials;
using grpc::ServerBuilder;

using namespace std;

StatsServerImpl::StatsServerImpl() {
}

Status StatsServerImpl::FocusWrite(
    ServerContext* context, const FocusWriteRequest* request,
    FocusWriteResponse* response) {
    cout << request->request_id() << endl;
    response->set_request_id(request->request_id());

    return Status::OK;
}

void RunServer() {
    const string& port = "50051";
    StatsServerImpl sync_service;
    ServerBuilder builder;

    builder.AddListeningPort("0.0.0.0:50051",
                             InsecureServerCredentials());
    builder.RegisterService(&sync_service);
    //cq_ = builder_.AddCompletionQueue();
    auto server = builder.BuildAndStart();

    cout << "Server started on port " << port << endl;

    server->Wait();
}

int main() {
    RunServer();

    cout << "Exiting main in server." << endl;

    return 0;
}
