const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildHelpJobElemMatch,
  extractObjectIdFromNote,
  findHelpJob,
  sameId,
} = require("../utils/jobScope");

const offerA = "111111111111111111111111";
const offerB = "222222222222222222222222";
const bidB = "bbbbbbbbbbbbbbbbbbbbbbbb";
const bidC = "cccccccccccccccccccccccc";

test("extractObjectIdFromNote reads offerId and BidId from payment notes", () => {
  const note = `offerId: ${offerA}. BidId: ${bidB}`;

  assert.equal(extractObjectIdFromNote(note, "offerId"), offerA);
  assert.equal(extractObjectIdFromNote(note, "BidId"), bidB);
});

test("sameId compares strings and object id fields", () => {
  assert.equal(sameId({ _id: offerA }, offerA), true);
  assert.equal(sameId({ id: offerA }, offerA), true);
  assert.equal(sameId(offerA, offerB), false);
  assert.equal(sameId(null, offerA), false);
});

test("findHelpJob returns only the exact bid-scoped job when bidId is present", () => {
  const jobs = [
    { offer: offerA, bid: bidB, status: "completed" },
    { offer: offerA, bid: bidC, status: "open" },
    { offer: offerA, status: "legacy" },
  ];

  assert.deepEqual(findHelpJob(jobs, offerA, bidC), jobs[1]);
  assert.equal(findHelpJob(jobs, offerA, "dddddddddddddddddddddddd"), null);
});

test("findHelpJob does not fall back to another accepted request for the same offer", () => {
  const jobs = [
    { offer: offerA, bid: bidB, status: "pending" },
    { offer: offerA, bid: bidC, status: "open" },
  ];

  assert.equal(findHelpJob(jobs, offerA, "dddddddddddddddddddddddd"), null);
});

test("findHelpJob without bidId only returns legacy unscoped jobs", () => {
  const legacy = { offer: offerA, status: "legacy" };
  const jobs = [
    { offer: offerA, bid: bidB, status: "pending" },
    legacy,
  ];

  assert.deepEqual(findHelpJob(jobs, offerA), legacy);
});

test("buildHelpJobElemMatch requires exact bid when bidId is present", () => {
  assert.deepEqual(buildHelpJobElemMatch(offerA, bidB), {
    offer: offerA,
    bid: bidB,
  });
});

test("buildHelpJobElemMatch without bidId targets only legacy unscoped jobs", () => {
  assert.deepEqual(buildHelpJobElemMatch(offerA), {
    offer: offerA,
    $or: [{ bid: { $exists: false } }, { bid: null }],
  });
});
