var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { MongoClient, ServerApiVersion } from "mongodb";
const username = encodeURIComponent("");
const password = encodeURIComponent("");
const clusterURL = "localhost:27017";
export const uri = `mongodb://${clusterURL}/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.3.9`;
export const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
export function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield client.connect();
            yield client.db("admin").command({ ping: 1 });
            console.log("Successfully connected to MongoDB.");
        }
        catch (err) {
            console.error(err);
            yield client.close();
        }
    });
}
export function close() {
    return __awaiter(this, void 0, void 0, function* () {
        yield client.close();
    });
}
//# sourceMappingURL=db.js.map