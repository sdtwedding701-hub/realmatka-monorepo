import { corsPreflight } from "../http.mjs";
import { bidsHistoryController } from "../controllers/bids-controller.mjs";

export function options(request) {
  return corsPreflight(request);
}

export async function history(request) {
  return bidsHistoryController(request);
}
