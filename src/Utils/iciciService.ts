import axios from "axios";
import { encryptForIcici, decryptFromIcici } from "./iciciCrypto"

const ICICI_URL = "https://apibankingonesandbox.icicibank.com/api/v1/composite-payment_sv";
const ICICI_API_KEY = "MVcF4C4SGG9tto2dyqjjdHLlFTAYuAhf";

/**
 * Build ICICI payload based on type (IMPS or NEFT)
 */
function buildPayload(type:any, user:any) {
  const { bankDetails, amountToPay } = user;

  if (type === "IMPS") {
    return {
      localTxnDtTime: new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14),
      beneAccNo: bankDetails.accountNo,
      beneIFSC: bankDetails.ifsc,
      amount: amountToPay.toString(),
      tranRefNo: "TXN" + Date.now() + Math.floor(Math.random() * 1000),
      paymentRef: "BulkPayout",
      senderName: bankDetails.accountName,
      mobile: "9999988888",
      retailerCode: "rcode",
      passCode: "447c4524c9074b8c97e3a3c40ca7458d",
      bcID: "IBCKer00131",
      aggrId: "CUST0540",
      crpId: "PRACHICIB65",
      crpUsr: "",
    };
  }

  // NEFT
  return {
    tranRefNo: "TXN" + Date.now() + Math.floor(Math.random() * 1000),
    amount: amountToPay.toFixed(2),
    senderAcctNo: "010205001809",
    beneAccNo: bankDetails.accountNo,
    beneName: bankDetails.accountName,
    beneIFSC: bankDetails.ifsc,
    narration1: "NEFT Payout",
    narration2: "BulkPayout",
    crpId: "TXBCORP1",
    crpUsr: "USER1",
    aggrId: "TXBCIBTEST001",
    aggrName: "CIBTESTING",
    urn: "TEST123",
    txnType: "RGS",
    WORKFLOW_REQD: "N",
  };
}

/**
 * Send payment to ICICI API
 */
export async function sendIciciPayment(user:any) {
  const type = user.amountToPay < 200000 ? "IMPS" : "NEFT";
  const payload = buildPayload(type, user);

  const { encryptedKey, encryptedData } = encryptForIcici(payload);

  const response = await axios.post(
    ICICI_URL,
    { encryptedKey, encryptedData },
    {
      headers: {
        "x-api-key": ICICI_API_KEY,
        "Content-Type": "application/json",
      },
    }
  );

  const decrypted = decryptFromIcici(response.data.encryptedKey, response.data.encryptedData);

  return {
    userId: user._id,
    type,
    status: decrypted.status || "unknown",
    iciciResponse: decrypted,
  };
}
