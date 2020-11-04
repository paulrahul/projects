#include "stats_svc.grpc.pb.h"

using std::unique_ptr;

using grpc::ClientAsyncResponseReaderInterface;
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
        
        // std::unique_ptr<ClientAsyncResponseReaderInterface<FocusWriteResponse>>
        //     AsyncFocusWrite(::grpc::ClientContext* context, const ::FocusWriteRequest& request, ::grpc::CompletionQueue* cq) {

    private:
        //FocusStatsService::AsyncService service_;
        unique_ptr<ServerCompletionQueue> cq_;
};  
