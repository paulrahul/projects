#include "stats_svc.grpc.pb.h"

using grpc::InsecureServerCredentials;
using grpc::Server;
using grpc::ServerBuilder;

class StatsServer {
    public:
        StatsServer();

    private:
        FocusStatsService::AsyncService service_;
        ServerBuilder builder_;
};  