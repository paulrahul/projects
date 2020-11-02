#include "stats_svc.grpc.pb.h"

using std::unique_ptr;

using grpc::Server;
using grpc::ServerBuilder;
using grpc::ServerCompletionQueue;

class StatsServer {
    public:
        StatsServer();

        void Run();

    private:
        FocusStatsService::AsyncService service_;

        ServerBuilder builder_;
        unique_ptr<ServerCompletionQueue> cq_;
        unique_ptr<Server> server_;
};  