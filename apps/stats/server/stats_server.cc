#include "stats_server.h"

#include <iostream>

#include <grpcpp/grpcpp.h>

using grpc::InsecureServerCredentials;

using namespace std;

StatsServer::StatsServer() {
}

void StatsServer::Run() {
    const string& port = "9090";

    builder_.AddListeningPort("0.0.0.0:" + port,
                              InsecureServerCredentials());
    builder_.RegisterService(&service_);
    cq_ = builder_.AddCompletionQueue();
    server_ = builder_.BuildAndStart();

    cout << "Server started on port " << port << endl;

    server_->Wait();
}

int main() {
    StatsServer server;
    server.Run();

    return 0;
}