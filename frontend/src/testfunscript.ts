
import { assertEq, log } from "./helpers"
import "./funscript"
import { tokenize } from "./funscript"




assertEq(tokenize({code:'"hello"', idx:0}).value, {start:0, end:7, type:'string'})
assertEq(tokenize({code:' ', idx:0}).value, {start:0, end:1, type:'whitespace'})