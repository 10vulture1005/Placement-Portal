import assert from "node:assert/strict";import test from "node:test";import{evaluateEligibility,isEligible}from"./eligibility";
const job={minCgpa:7.5,batch:2027,branches:["CSE","IT"],maxBacklogs:0,maxBans:0};
test("eligible student passes every criterion",()=>{const checks=evaluateEligibility({cgpa:8.2,batch:2027,branch:"CSE",backlogs:0,bans:0,documentsComplete:true},job);assert.equal(isEligible(checks),true)});
test("a failed criterion makes the student ineligible",()=>{const checks=evaluateEligibility({cgpa:6.9,batch:2027,branch:"CSE",backlogs:0,bans:0,documentsComplete:true},job);assert.equal(isEligible(checks),false);assert.equal(checks.find(c=>c.key==="cgpa")?.pass,false)});
