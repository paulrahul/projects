#include <iostream>

#include <grpcpp/grpcpp.h>

#include "stats_server.h"

StatsServer::StatsServer() {
    builder_.AddListeningPort("0.0.0.0:9090", InsecureServerCredentials());
    builder_.RegisterService(&service_);
    auto cq = builder_.AddCompletionQueue();
    auto server = builder_.BuildAndStart();    
}