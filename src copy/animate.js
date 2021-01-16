/* any other function not being classified */
"use strict"
var g_speed = 1;
var g_angle01 = 0.0;
var currentAngle = 0.0;
var g_viewScale = 1;
var g_cloudAngle = 1, g_cloudAngleRate = 1.8,  g_cloudAngleMin = 0,  g_cloudAngleMax = 6;
var g_jointAngle = 0, g_jointAngleRate = 0.6,  g_jointAngleMin = -2,  g_jointAngleMax = 2;  
var g_jointAngle2 = 0, g_jointAngleRate2 = 1.2,  g_jointAngleMin2 = -20,  g_jointAngleMax2 = 20;  
var g_time = 0, g_endSHOtime = 100, g_SHOgap = 0.1, g_damping1 = 20;

var g_matrixStack = []; // Array for storing a matrix
function pushMatrix(m) { // Store the specified matrix to the array
    var m2 = new Matrix4(m);
    g_matrixStack.push(m2);
}

function popMatrix() { // Retrieve the matrix from the array
    return g_matrixStack.pop();
}

// ! for animation variables =================================
var g_lastCloud = Date.now();
var isForward = true;
function animateCloud() {
    var now = Date.now();  // Calculate the elapsed time
    var elapsed = now - g_lastCloud;
    g_lastCloud = now; 
    var newAngle = 0;
    if(newAngle < 0 || newAngle > 3){ return 1;}
    if(isForward){
      newAngle = g_cloudAngle + (g_cloudAngleRate * elapsed) / 1000.0;
    }
    if(newAngle > g_cloudAngleMax){ isForward = false;}
    if(!isForward){
      newAngle = g_cloudAngle - (g_cloudAngleRate * elapsed) / 1000.0;
    } 
    if(newAngle < g_cloudAngleMin){ isForward = true;}
    return newAngle;
}

var g_last3 = Date.now();
function showCurTime() {
    if(g_isDrag){
        g_last3 = Date.now();
    }
    var now = Date.now();  // Calculate the elapsed time
    var elapsed = now - g_last3;
    return elapsed;
}

var g_last4J = Date.now();
var isForward2 = true;
function animateJoints() {
    var now = Date.now();  // Calculate the elapsed time
    var elapsed = now - g_last4J;
    g_last4J = now; 
    var newAngle = 0;
    if(isForward2){
      newAngle = g_jointAngle + (g_jointAngleRate * elapsed) / 360.0;
    }
    if(newAngle > g_jointAngleMax){ isForward2 = false;}
    if(!isForward2){
      newAngle = g_jointAngle - (g_jointAngleRate * elapsed) / 360.0;
    } 
    if(newAngle < g_jointAngleMin){ isForward2 = true;}
    return newAngle;
}

var g_last5J = Date.now();
var isForward3 = true;
function animateJoints2() {
    var now = Date.now();  // Calculate the elapsed time
    var elapsed = now - g_last5J;
    g_last5J = now; 
    var newAngle = 0;
    if(isForward3){
      newAngle = g_jointAngle2 + (g_jointAngleRate2 * elapsed) / 360.0;
    }
    if(newAngle > g_jointAngleMax2){ isForward3 = false;}
    if(!isForward3){
      newAngle = g_jointAngle2 - (g_jointAngleRate2 * elapsed) / 360.0;
    } 
    if(newAngle < g_jointAngleMin2){ isForward3 = true;}
    return newAngle;
}

var ANGLE_STEP = 50;   // The increments of rotation angle (degrees)
var last = Date.now(); // Last time that this function was called
function animate(angle) {
    var now = Date.now();   // Calculate the elapsed time
    var elapsed = now - last;
    last = now;
    // Update the current rotation angle (adjusted by the elapsed time)
    var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
    return newAngle % 360;
}