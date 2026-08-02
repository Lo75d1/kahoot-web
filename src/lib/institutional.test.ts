import {describe,expect,it} from "vitest";
import {examWindow,importStudentsCsv} from "./institutional";
describe("institutional assessment",()=>{it("imports student lists",()=>{expect(importStudentsCsv("Mã SV,Họ tên,Email\nSV01,Nguyễn An,an@uda.vn")[0]).toMatchObject({code:"SV01",name:"Nguyễn An"});});it("enforces exam windows",()=>{const base={opensAt:"2026-08-02T08:00:00Z",closesAt:"2026-08-02T09:00:00Z"} as never;expect(examWindow(base,Date.parse("2026-08-02T08:30:00Z"))).toBe("active");expect(examWindow(base,Date.parse("2026-08-02T07:00:00Z"))).toBe("upcoming");});});
