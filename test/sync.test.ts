import * as supernote from "supernote-cloud-api";
import { assert } from "chai";
import nock from "nock";
import { syncFiles } from "../src/index.js";

describe("sync tests", function () {
  it("truth", function () {
    assert.equal(!!1, true);
  });

  it("sync", async () => {
    /*
    let token = await supernote.login("a", "b");
    console.log(token);
    await syncFiles(token, "/tmp/sync");
    */
  }).timeout(60000);

  beforeEach(() => {
    //nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
    //nock.enableNetConnect();
  });
});
