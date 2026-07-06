import request from "./request";

export function getHolidays(year) {
  return request.get("/holiday", { params: { year } });
}
