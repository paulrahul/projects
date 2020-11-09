#include "stats_client.h"

#include <grpcpp/grpcpp.h>

using namespace std;

using grpc::ClientAsyncResponseReader;
using grpc::ClientAsyncResponseReaderInterface;
using grpc::CompletionQueue;
using grpc::ClientContext;
using grpc::Status;

StatsClient::StatsClient(shared_ptr<ChannelInterface> channel)
    : stub_(FocusStatsService::NewStub(channel)) {
}

StatsClient::~StatsClient() {
}

void StatsClient::SendRequest() {
    FocusWriteRequest req;
    req.set_request_id(123);
    
    FocusWriteResponse res;

    ClientContext context;

    Status status = stub_->FocusWrite(&context, req, &res);
    if (status.ok()) {
        cout << "Received response: " << res.ShortDebugString() << endl;
    } else {
        cout << "Failed with error: " << status.error_code() << ": "
             << status.error_message() << endl;
    }
}

void StatsClient::SendAsyncRequest() {
    FocusWriteRequest req;
    req.set_request_id(123);
    
    FocusWriteResponse res;

    ClientContext context;

    CompletionQueue cq;

    Status status;

    unique_ptr<ClientAsyncResponseReader<FocusWriteResponse>> rpc(
        stub_->AsyncFocusWrite(&context, req, &cq));

    rpc->Finish(&res, &status, (void*)1);

    // unique_ptr<ClientAsyncResponseReader<FocusWriteResponse>>
    //   rpc(stub_->PrepareAsyncFocusWrite(&context, req, &cq));

    // rpc->StartCall();

    // rpc->Finish(&res, &status, (void*)1);

    void* got_tag;
    bool ok = false;

    if (cq.Next(&got_tag, &ok)) {
        if (got_tag != (void*)1) {
            cout << "Unexpected tag obtained: " << got_tag << endl;
        }

        if (!ok) {
            cout << "Completion Queue check unsuccessful" << endl;
        }

        if (status.ok()) {
            cout << "Tag: " << got_tag << endl;
            cout << "Received response: " << res.ShortDebugString() << endl;
        } else {
            cout << "Failed with error: " << status.error_code() << ": "
                 << status.error_message() << endl;
        }
    }
}

int main() {
    StatsClient client(grpc::CreateChannel(
        "localhost:50051", grpc::InsecureChannelCredentials()));

    // client.SendRequest();
    client.SendAsyncRequest();

    return 0;
}
