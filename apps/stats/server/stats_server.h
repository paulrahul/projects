#include "stats_svc.grpc.pb.h"

using std::unique_ptr;

using grpc::ClientAsyncResponseReaderInterface;
using grpc::Server;
using grpc::ServerContext;
using grpc::ServerCompletionQueue;
using grpc::Status;

class StatsServerImpl final : public FocusStatsService::Service {
    public:
        StatsServerImpl();

        void Run();

        Status FocusWrite(ServerContext* context,
                          const FocusWriteRequest* request,
                          FocusWriteResponse* response);

        void HandleRpcs();
    private:
        unique_ptr<FocusStatsService::AsyncService> async_service_;
        unique_ptr<ServerCompletionQueue> cq_;
        unique_ptr<Server> server_;
};  
