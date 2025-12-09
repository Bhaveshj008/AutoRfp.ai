require("module-alias/register");
require("dotenv").config();

const { pollInboxForRfpEmails } = require("./imapWorker");

(async () => {
  try {
    await pollInboxForRfpEmails();
    process.exit(0);
  } catch (err) {
    console.error(" IMAP worker crashed:", err);
    process.exit(1);
  }
})();
