const extractObjectIdFromNote = (note = "", label) => {
  const match = note.match(new RegExp(`${label}\\s*:\\s*([a-fA-F0-9]{24})`, "i"));
  return match?.[1] || null;
};

const objectId = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value._id || value.id || value;
};

const sameId = (a, b) => {
  const left = objectId(a);
  const right = objectId(b);
  return Boolean(left && right && left.toString() === right.toString());
};

const findHelpJob = (jobs = [], offerId, bidId = null) => {
  if (!offerId) return null;

  if (bidId) {
    return jobs.find((job) => sameId(job.offer, offerId) && sameId(job.bid, bidId)) || null;
  }

  return jobs.find((job) => sameId(job.offer, offerId) && !job.bid) || null;
};

const buildHelpJobElemMatch = (offerId, bidId) => {
  if (bidId) {
    return { offer: offerId, bid: bidId };
  }

  return {
    offer: offerId,
    $or: [{ bid: { $exists: false } }, { bid: null }],
  };
};

module.exports = {
  buildHelpJobElemMatch,
  extractObjectIdFromNote,
  findHelpJob,
  sameId,
};
