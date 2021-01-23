/*
a single Javascript object (e.g. PartSys prototype or class) 
that contains and defines the entire particle system, including: 
 1. three state variables -- 
    s1 for current timestep; 
    s1dot for its time-derivative; 
    s2 for next timestep
*/
"use strict"

// ? Size of array in CPart uses to store its values. 
const PART_MAXVAR = 17;   // TODO

function VBO_particle(vertSrc, fragSrc, particleNum) {
    // ! shader
    this.VERT_SRC = vertSrc;
    this.FRAG_SRC = fragSrc;

    // ! positions
    this.randX = 0;
    this.randY = 0;
    this.randZ = 0;
    this.particleNum = particleNum;


    // ! forces
    this.forceList = [];

    // ! constraints
    this.limitList = [];
}

VBO_particle.prototype.init = function () {
    /*
    argument selects among several different kinds of particle systems 
    and initial conditions.
    */
   this.s1 = new Float32Array(this.particleNum * PART_MAXVAR);  // current timestep
   this.s2 = new Float32Array(this.particleNum * PART_MAXVAR);  // next timestep
   this.s1dot = new Float32Array(this.particleNum * PART_MAXVAR);  // time-derivative

   // TODO: create force-causing objects

}

VBO_particle.prototype.applyAllForces = function () {
    /*
    accepts a state variable 
    and an array of force-applying objects 
    (e.g. a Forcer prototype or class; then make an array of these objects), 
    and applies them to the given state variable
    */

}

VBO_particle.prototype.dotFinder = function () {
    /*
    state variable 's' as an argument 
    computes its time-derivative sDot
    */

}

VBO_particle.prototype.solver = function () {
    /*
    creates s2 contents by approximating integration of s1 over one one timestep.
    */

}

VBO_particle.prototype.doConstraint = function () {
    /*
    accepts state variables s1 and s2 
    an array of constraint-applying objects.  
    This function applies constraints to all changes between s1 and s2, and modifies s2 so that the result meets all the constraints.  
    Currently our only constraints are the 'floor' and walls for our bouncy-ball particles.
    */

}

VBO_particle.prototype.render = function () {
    /*
    updates an existing VBO's contents from state variable (s2) using WebGL's 'bufferSubData()' call, 
    then draws it on-screen.   
    Note that 'bufferSubData()' does not reallocate and GPU memory 
        your new/updated data MUST fit within the GPU memory previously allotted to that VBO.
        https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/bufferSubData 
    */

}

VBO_particle.prototype.swap = function () {
    /*
    exchanges the contents of s1 and s2 by swapping their references (don't copy/recopy all this data!)
    */

}

