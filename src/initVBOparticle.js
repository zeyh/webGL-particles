"use strict"

const PART_XPOS = 0;  //  position    
const PART_YPOS = 1;
const PART_ZPOS = 2;
const PART_WPOS = 3;  // matrix transforms - vector/point distinction
const PART_XVEL = 4;  //  velocity -- ALWAYS a vector: x,y,z; no w. (w==0)    
const PART_YVEL = 5;
const PART_ZVEL = 6;
const PART_X_FTOT = 7;  // force accumulator:'ApplyForces()' fcn clears
const PART_Y_FTOT = 8;  // to zero, then adds each force to each particle.
const PART_Z_FTOT = 9;
const PART_R = 10;  // color : red,green,blue, alpha (opacity); 0<=RGBA<=1.0
const PART_G = 11;
const PART_B = 12;
const PART_MASS = 13;  // mass   
const PART_DIAM = 14;	// on-screen diameter (in pixels)
const PART_RENDMODE = 15;
const PART_AGE = 16;  // # of frame-times until re-initializing
const PART_MAXVAR = 17; // max index = size of array

const SOLV_EULER = 0;       // Euler integration: forward,explicit,...
const SOLV_MIDPOINT = 1;       // Midpoint Method (see Pixar Tutorial)
const SOLV_ADAMS_BASH = 2;       // Adams-Bashforth Explicit Integrator
const SOLV_RUNGEKUTTA = 3;       // Arbitrary degree, set by 'solvDegree'
const SOLV_OLDGOOD = 4;      //  early accidental 'good-but-wrong' solver
const SOLV_BACK_EULER = 5;      // 'Backwind' or Implicit Euler
const SOLV_BACK_MIDPT = 6;      // 'Backwind' or Implicit Midpoint
const SOLV_BACK_ADBASH = 7;      // 'Backwind' or Implicit Adams-Bashforth
const SOLV_VERLET = 8;       // Verlet semi-implicit integrator;
const SOLV_VEL_VERLET = 9;       // 'Velocity-Verlet'semi-implicit integrator
const SOLV_LEAPFROG = 10;      // 'Leapfrog' integrator
const SOLV_MAX = 11;      // number of solver types available.
const NU_EPSILON = 10E-15;         // a tiny amount; a minimum vector length
// to use to avoid 'divide-by-zero'

function PartSys() {
    this.randX = 0;
    this.randY = 0;
    this.randZ = 0;
    this.forceList = [];
    this.limitList = [];
    this.MvpMat = new Matrix4(); // Transforms CVV axes to model axes.
}

PartSys.prototype.initShader = function (vertSrc, fragSrc) {
    this.VERT_SRC = vertSrc;
    this.FRAG_SRC = fragSrc;
    this.shaderLoc = createProgram(gl, this.VERT_SRC, this.FRAG_SRC);
    if (!this.shaderLoc) {
        console.log(
            this.constructor.name +
            ".init() failed to create executable Shaders on the GPU. Bye!"
        );
        return;
    } else {
        // console.log('You called: '+ this.constructor.name + '.init() fcn!');
    }
    gl.program = this.shaderLoc;  // switching gl program to this one

    // ! init attribute locations 
    this.a_PosLoc = gl.getAttribLocation(this.shaderLoc, "a_Position");
    this.u_MvpMatLoc = gl.getUniformLocation(this.shaderLoc, "u_MvpMatrix");
    if (this.a_PosLoc < 0 || !this.u_MvpMatLoc) {
        console.log(
            this.constructor.name +
            ".init() failed to get the GPU location of [a_pos, mvpMatrix]attributes"
        );
        return -1; // error exit.
    }

    // ! [Vertex] buffer
    this.vboID = gl.createBuffer();
    if (!this.vboID) {
        console.log('PartSys.init() Failed to create the VBO object in the GPU');
        return -1;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vboID);
    gl.bufferData(gl.ARRAY_BUFFER, this.s1, gl.DYNAMIC_DRAW);

    this.a_PositionID = gl.getAttribLocation(this.shaderLoc, 'a_Position');
    if (this.a_PositionID < 0) {
        console.log('PartSys.init() Failed to get the storage location of a_Position');
        return -1;
    }

    this.a_ColorID = gl.getAttribLocation(this.shaderLoc, "a_Color");
    if (this.a_ColorID < 0) {
        console.log('PartSys.init() Failed to get a_Color variable location');
        return;
    }

    this.u_runModeID = gl.getUniformLocation(this.shaderLoc, 'u_runMode');
    if (!this.u_runModeID) {
        console.log('PartSys.init() Failed to get u_runMode variable location');
        return;
    }
}

PartSys.prototype.initBouncy2D = function (count) {
    /*
    argument selects among several different kinds of particle systems 
    and initial conditions.
    */
    // ! force-causing objects
    var fTmp = new CForcer();       // create a force-causing object, and
    // * earth gravity for all particles:
    fTmp.forceType = F_GRAV_E;      // set it to earth gravity, and
    fTmp.targFirst = 0;             // set it to affect ALL particles:
    fTmp.partCount = -1;            // (negative value means ALL particles and IGNORE all other Cforcer members...)
    this.forceList.push(fTmp);      // append this 'gravity' force object to 
    // the forceList array of force-causing objects.
    // * drag for all particles:
    fTmp = new CForcer();           // create a NEW CForcer object 
    fTmp.forceType = F_DRAG;        // Viscous Drag
    fTmp.Kdrag = 0.15;              // in Euler solver, scales velocity by 0.85
    fTmp.targFirst = 0;             // apply it to ALL particles:
    fTmp.partCount = -1;
    this.forceList.push(fTmp);
    console.log("\t\t", this.forceList.length, "CForcer objects:");

    // ! Create & init all constraint-causing objects
    var cTmp = new CLimit();        // creat constraint-causing object, and
    cTmp.hitType = HIT_BOUNCE_VEL;  // set how particles 'bounce' from its surface,
    cTmp.limitType = LIM_VOL;       // confine particles inside axis-aligned 
    // rectangular volume that
    cTmp.partFirst = 0;             // applies to ALL particles; starting at 0 
    cTmp.partCount = -1;            // through all the rest of them.
    cTmp.xMin = -1.0; cTmp.xMax = 1.0;  // box extent:  +/- 1.0 box at origin
    cTmp.yMin = -1.0; cTmp.yMax = 1.0;
    cTmp.zMin = -1.0; cTmp.zMax = 1.0;
    cTmp.Kresti = 1.0;              // bouncyness: coeff. of restitution.
    // (and IGNORE all other CLimit members...)
    this.limitList.push(cTmp);      // append this 'box' constraint object to the
    // 'limitList' array of constraint-causing objects.                                
    console.log("\t\t", this.forceList.length, "CLimit objects.");

    // ! ode constants
    this.partCount = count;
    this.s1 = new Float32Array(this.partCount * PART_MAXVAR);
    this.s2 = new Float32Array(this.partCount * PART_MAXVAR);
    this.s1dot = new Float32Array(this.partCount * PART_MAXVAR);

    this.INIT_VEL = 0.15 * 60.0;
    this.drag = 0.985; //friction force
    this.grav = 9.832; //gravity constant
    this.resti = 1.0; //inelastic
    this.runMode = 3;
    // this.solvType = 1;
    this.solvType = SOLV_OLDGOOD;
    this.bounceType = 1;

    var j = 0;
    for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
        this.roundRand();
        this.s1[j + PART_XPOS] = -0.8 + 0.1 * this.randX;
        this.s1[j + PART_YPOS] = -0.8 + 0.1 * this.randY;
        this.s1[j + PART_ZPOS] = -0.8 + 0.1 * this.randZ;
        this.s1[j + PART_WPOS] = 1.0;
        this.s1[j + PART_R] = Math.abs(this.randX);
        this.s1[j + PART_G] = Math.abs(this.randY);
        this.s1[j + PART_B] = 0.9;
        this.roundRand();
        this.s1[j + PART_XVEL] = this.INIT_VEL * (0.4 + 0.2 * this.randX);
        this.s1[j + PART_YVEL] = this.INIT_VEL * (0.4 + 0.2 * this.randY);
        this.s1[j + PART_ZVEL] = this.INIT_VEL * (0.4 + 0.2 * this.randZ);
        this.s1[j + PART_MASS] = 1.0;
        this.s1[j + PART_DIAM] = 2.0 + 10 * Math.random(); // on-screen diameter, in pixels
        this.s1[j + PART_RENDMODE] = 0.0;
        this.s1[j + PART_AGE] = 30 + 100 * Math.random();
        this.s2.set(this.s1);
    }
    this.FSIZE = this.s1.BYTES_PER_ELEMENT;

}

PartSys.prototype.switchToMe = function () {
    gl.useProgram(this.shaderLoc);
    gl.uniform1i(this.runModeID, this.runMode); //bound keyboard callbacks

    // ! bindBuffer vertexAttribPointer enableVertexAttribArray
    this.FSIZE = this.s1.BYTES_PER_ELEMENT;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vboID); // ! 👈 finally debugged......
    
    gl.vertexAttribPointer(this.a_PositionID, 4, gl.FLOAT, false,
        PART_MAXVAR * this.FSIZE, PART_XPOS * this.FSIZE);
    gl.enableVertexAttribArray(this.a_PositionID);

    gl.vertexAttribPointer(this.a_ColorID, 4, gl.FLOAT, false,   
        PART_MAXVAR*this.FSIZE, PART_R * this.FSIZE); 
    gl.enableVertexAttribArray(this.a_ColorID);

}

PartSys.prototype.isReady = function () { //very brief sanity check
    var isOK = true;
    if (gl.getParameter(gl.CURRENT_PROGRAM) != this.shaderLoc) {
        console.log(
            this.constructor.name +
            ".isReady() false: shader program at this.shaderLoc not in use!"
        );
        isOK = false;
    }
    return isOK;
}

PartSys.prototype.render = function (g_modelMatrix, g_viewProjMatrix) { //finally drawing🙏
    if (this.isReady() == false) {
        console.log(
            "ERROR! before" +
            this.constructor.name +
            ".draw() call you needed to call this.switchToMe()!!"
        );
    }

    // ! model matrix
    this.MvpMat.set(g_viewProjMatrix);
    this.MvpMat.multiply(g_modelMatrix);
    gl.uniformMatrix4fv(this.u_MvpMatLoc, false, this.MvpMat.elements);

    // ! particle movement
    // console.log(gl.getBufferParameter(gl.ARRAY_BUFFER, gl.BUFFER_SIZE));
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.s1);
    gl.uniform1i(this.u_runModeID, this.runMode);

    // ! drawing
    gl.drawArrays(gl.POINTS, 0, this.partCount);
}

PartSys.prototype.applyForces = function (s, fList) {
    /*
    a function that accepts a state variable and an array of force-applying objects (e.g. a Forcer prototype or class; then make an array of these objects), and applies them to the given state variable
    */

    var j = 0;  // i==particle number; j==array index for i-th particle
    for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
        s[j + PART_X_FTOT] = 0.0;
        s[j + PART_Y_FTOT] = 0.0;
        s[j + PART_Z_FTOT] = 0.0;
    }
    for (var k = 0; k < fList.length; k++) {  // iterate through every cForce
        if (fList[k].forceType <= 0) { // ignore F_NONE or temporarily disabled CForcer
            continue;
        }
        if (fList[k].partCount != 0) {
            var m = fList[k].partFirst;     // particle # for 1st one affected;
            var mmax = this.partCount;      // total number of particles in state s
            if (fList[k].partCount > 0) {    // did forcer specify HOW MANY particles?
                // (recall: if <0, forcer affects all particles from partFirst onwards)
                // YES.  limit this CForcer to only that many particles.
                mmax = m + fList[k].partCount - 1;
            }           // m and mmax are now correctly initialized; use them!   
            switch (fList[k].forceType) {    // what force should we apply to these particles
                case F_MOUSE:     // Spring-like connection to mouse cursor
                    console.log("PartSys.applyForces(), fList[", k, "].forceType:",
                        fList[k].forceType, "NOT YET IMPLEMENTED!!");
                    break;
                case F_GRAV_E:    // Earth-gravity pulls 'downwards' as defined by downDir
                    var j = m * PART_MAXVAR;  // state var array index for particle # m
                    for (; m < mmax; m++, j += PART_MAXVAR) { // for every part# from m to mmax-1,
                        // force from gravity == mass * gravConst * downDirection
                        s[j + PART_X_FTOT] += s[j + PART_MASS] * fList[k].gravConst *
                            fList[k].downDir.elements[0];
                        s[j + PART_Y_FTOT] += s[j + PART_MASS] * fList[k].gravConst *
                            fList[k].downDir.elements[1];
                        s[j + PART_Z_FTOT] += s[j + PART_MASS] * fList[k].gravConst *
                            fList[k].downDir.elements[2];
                    }
                    break;
                case F_GRAV_P:    // planetary gravity
                    console.log("PartSys.applyForces(), fList[", k, "].forceType:",
                        fList[k].forceType, "NOT YET IMPLEMENTED!!");
                    break;
                case F_DRAG:      // viscous drag: force = -K_drag * velocity.
                    var j = m * PART_MAXVAR;  // state var array index for particle # m
                    for (; m < mmax; m++, j += PART_MAXVAR) { // for every particle# from m to mmax-1,
                        // force from gravity == mass * gravConst * downDirection
                        s[j + PART_X_FTOT] -= fList[k].K_drag * s[j + PART_XVEL];
                        s[j + PART_Y_FTOT] -= fList[k].K_drag * s[j + PART_YVEL];
                        s[j + PART_Z_FTOT] -= fList[k].K_drag * s[j + PART_ZVEL];
                    }
                    break;
                case F_WIND:      // Blowing-wind-like force-field; fcn of 3D position
                    console.log("PartSys.applyForces(), fList[", k, "].forceType:",
                        fList[k].forceType, "NOT YET IMPLEMENTED!!");
                    break;
                case F_BUBBLE:    // Constant inward force (bub_force)to a 3D centerpoint 
                    // bub_ctr if particle is > bub_radius away from it.
                    console.log("PartSys.applyForces(), fList[", k, "].forceType:",
                        fList[k].forceType, "NOT YET IMPLEMENTED!!");
                    break;
                case F_SPRING:
                    console.log("PartSys.applyForces(), fList[", k, "].forceType:",
                        fList[k].forceType, "NOT YET IMPLEMENTED!!");
                    break;
                case F_SPRINGSET:
                    console.log("PartSys.applyForces(), fList[", k, "].forceType:",
                        fList[k].forceType, "NOT YET IMPLEMENTED!!");
                    break;
                case F_CHARGE:
                default:
                    console.log("!!!ApplyForces() fList[", k, "] invalid forceType:", fList[k].forceType);
                    break;
            } // switch(fList[k].forceType)
        } // if partCount !=0)...
    } // for(k=0...)
}

PartSys.prototype.dotFinder = function (dest, src) {
    /* 
    numerical differentiation for time derivative
    */
    var invMass;  // inverse mass
    var j = 0;  // i==particle number; j==array index for i-th particle
    for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
        dest[j + PART_XPOS] = src[j + PART_XVEL];   // position derivative = velocity
        dest[j + PART_YPOS] = src[j + PART_YVEL];
        dest[j + PART_ZPOS] = src[j + PART_ZVEL];
        dest[j + PART_WPOS] = 0.0;                  // presume 'w' fixed at 1.0
        // Use 'src' current force-accumulator's values (set by PartSys.applyForces())
        // to find acceleration.  As multiply is FAR faster than divide, do this:
        invMass = 1.0 / src[j + PART_MASS];   // F=ma, so a = F/m, or a = F(1/m);
        dest[j + PART_XVEL] = src[j + PART_X_FTOT] * invMass;
        dest[j + PART_YVEL] = src[j + PART_Y_FTOT] * invMass;
        dest[j + PART_ZVEL] = src[j + PART_Z_FTOT] * invMass;
        dest[j + PART_X_FTOT] = 0.0;  // we don't know how force changes with time;
        dest[j + PART_Y_FTOT] = 0.0;  // presume it stays constant during timestep.
        dest[j + PART_Z_FTOT] = 0.0;
        dest[j + PART_R] = 0.0;       // color doesn't change with time.
        dest[j + PART_G] = 0.0;
        dest[j + PART_B] = 0.0;
        dest[j + PART_MASS] = 0.0;    // we don't know how these change with time;
        dest[j + PART_DIAM] = 0.0;    // presume they stay constant during timestep.   
        dest[j + PART_RENDMODE] = 0.0;
        dest[j + PART_AGE] = 0.0;
    }
}

PartSys.prototype.solver = function () {
    /*
    creates s2 contents by approximating integration of s1 over one one timestep.
    */
    switch (this.solvType) {
        case SOLV_EULER: // EXPLICIT euler s2 = s1 + s1dot*h
            for (var n = 0; i < this.s1.length; n++) {
                this.s2[n] = this.s1[n] + this.s1dot[n] * (g_timeStep * 0.001);
            }
            break;
        case SOLV_OLDGOOD: // IMPLICIT or 'reverse time' solver
            // this.swap(); //now swap in the draw() function
            var j = 0;
            for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
                this.s2[j + PART_YVEL] -= this.grav * (g_timeStep * 0.001);
                this.s2[j + PART_XVEL] *= this.drag;
                this.s2[j + PART_YVEL] *= this.drag;
                this.s2[j + PART_ZVEL] *= this.drag;
                // convert g_timeStep from milliseconds to seconds!
                this.s2[j + PART_XPOS] += this.s2[j + PART_XVEL] * (g_timeStep * 0.001);
                this.s2[j + PART_YPOS] += this.s2[j + PART_YVEL] * (g_timeStep * 0.001);
                this.s2[j + PART_ZPOS] += this.s2[j + PART_ZVEL] * (g_timeStep * 0.001);
            }
            break;
        default:
            console.log('?!?! unknown solver: g_partA.solvType==' + this.solvType);
            break;
    }
    return;
}

PartSys.prototype.doConstraints = function () {
    /*
    accepts state variables s1 and s2 
    an array of constraint-applying objects.  
    This function applies constraints to all changes between s1 and s2, and modifies s2 so that the result meets all the constraints.  
    Currently our only constraints are the 'floor' and walls for our bouncy-ball particles.
    */
    if (this.bounceType == 0) { //------------------------------------------------
        var j = 0;  // i==particle number; j==array index for i-th particle
        for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
            // simple velocity-reversal: 
            if (this.s2[j + PART_XPOS] < -0.9 && this.s2[j + PART_XVEL] < 0.0) {
                // bounce on left (-X) wall
                this.s2[j + PART_XVEL] = -this.resti * this.s2[j + PART_XVEL];
            }
            else if (this.s2[j + PART_XPOS] > 0.9 && this.s2[j + PART_XVEL] > 0.0) {
                // bounce on right (+X) wall
                this.s2[j + PART_XVEL] = -this.resti * this.s2[j + PART_XVEL];
            } //---------------------------
            if (this.s2[j + PART_YPOS] < -0.9 && this.s2[j + PART_YVEL] < 0.0) {
                // bounce on floor (-Y)
                this.s2[j + PART_YVEL] = -this.resti * this.s2[j + PART_YVEL];
            }
            else if (this.s2[j + PART_YPOS] > 0.9 && this.s2[j + PART_YVEL] > 0.0) {
                // bounce on ceiling (+Y)
                this.s2[j + PART_YVEL] = -this.resti * this.s2[j + PART_YVEL];
            } //---------------------------
            if (this.s2[j + PART_ZPOS] < -0.9 && this.s2[j + PART_ZVEL] < 0.0) {
                // bounce on near wall (-Z)
                this.s2[j + PART_ZVEL] = -this.resti * this.s2[j + PART_ZVEL];
            }
            else if (this.s2[j + PART_ZPOS] > 0.9 && this.s2[j + PART_ZVEL] > 0.0) {
                // bounce on far wall (+Z)
                this.s2[j + PART_ZVEL] = -this.resti * this.s2[j + PART_ZVEL];
            }
            //--------------------------
            // The above constraints change ONLY the velocity; nothing explicitly
            // forces the bouncy-ball to stay within the walls. If we begin with a
            // bouncy-ball on floor with zero velocity, gravity will cause it to 'fall' 
            // through the floor during the next timestep.  At the end of that timestep
            // our velocity-only constraint will scale velocity by -this.resti, but its
            // position is still below the floor!  Worse, the resti-weakened upward 
            // velocity will get cancelled by the new downward velocity added by gravity 
            // during the NEXT time-step. This gives the ball a net downwards velocity 
            // again, which again gets multiplied by -this.resti to make a slight upwards
            // velocity, but with the ball even further below the floor. As this cycle
            // repeats, the ball slowly sinks further and further downwards.
            // THUS the floor needs this position-enforcing constraint as well:
            if (this.s2[j + PART_YPOS] < -0.9) this.s2[j + PART_YPOS] = -0.9;
            else if (this.s2[j + PART_YPOS] > 0.9) this.s2[j + PART_YPOS] = 0.9; // ceiling
            if (this.s2[j + PART_XPOS] < -0.9) this.s2[j + PART_XPOS] = -0.9; // left wall
            else if (this.s2[j + PART_XPOS] > 0.9) this.s2[j + PART_XPOS] = 0.9; // right wall
            if (this.s2[j + PART_ZPOS] < -0.9) this.s2[j + PART_ZPOS] = -0.9; // near wall
            else if (this.s2[j + PART_ZPOS] > 0.9) this.s2[j + PART_ZPOS] = 0.9; // far wall
            // Our simple 'bouncy-ball' particle system needs this position-limiting
            // constraint ONLY for the floor and not the walls, as no forces exist that
            // could 'push' a zero-velocity particle against the wall. But suppose we
            // have a 'blowing wind' force that pushes particles left or right? Any
            // particle that comes to rest against our left or right wall could be
            // slowly 'pushed' through that wall as well -- THUS we need position-limiting
            // constraints for ALL the walls:
        } // end of for-loop thru all particles
    } // end of 'if' for bounceType==0
    else if (this.bounceType == 1) {
        //-----------------------------------------------------------------
        var j = 0;  // i==particle number; j==array index for i-th particle
        for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
            //--------  left (-X) wall  ----------
            if (this.s2[j + PART_XPOS] < -0.9) {// && this.s2[j + PART_XVEL] < 0.0 ) {
                // collision!
                this.s2[j + PART_XPOS] = -0.9;// 1) resolve contact: put particle at wall.
                this.s2[j + PART_XVEL] = this.s1[j + PART_XVEL];  // 2a) undo velocity change:
                this.s2[j + PART_XVEL] *= this.drag;	            // 2b) apply drag:
                // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
                // ATTENTION! VERY SUBTLE PROBLEM HERE!
                // need a velocity-sign test here that ensures the 'bounce' step will 
                // always send the ball outwards, away from its wall or floor collision. 
                if (this.s2[j + PART_XVEL] < 0.0)
                    this.s2[j + PART_XVEL] = -this.resti * this.s2[j + PART_XVEL]; // need sign change--bounce!
                else
                    this.s2[j + PART_XVEL] = this.resti * this.s2[j + PART_XVEL]; // sign changed-- don't need another.
            }
            //--------  right (+X) wall  --------------------------------------------
            else if (this.s2[j + PART_XPOS] > 0.9) { // && this.s2[j + PART_XVEL] > 0.0) {	
                // collision!
                this.s2[j + PART_XPOS] = 0.9; // 1) resolve contact: put particle at wall.
                this.s2[j + PART_XVEL] = this.s1[j + PART_XVEL];	// 2a) undo velocity change:
                this.s2[j + PART_XVEL] *= this.drag;			        // 2b) apply drag:
                // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
                // ATTENTION! VERY SUBTLE PROBLEM HERE! 
                // need a velocity-sign test here that ensures the 'bounce' step will 
                // always send the ball outwards, away from its wall or floor collision. 
                if (this.s2[j + PART_XVEL] > 0.0)
                    this.s2[j + PART_XVEL] = -this.resti * this.s2[j + PART_XVEL]; // need sign change--bounce!
                else
                    this.s2[j + PART_XVEL] = this.resti * this.s2[j + PART_XVEL];	// sign changed-- don't need another.
            }
            //--------  floor (-Y) wall  --------------------------------------------  		
            if (this.s2[j + PART_YPOS] < -0.9) { // && this.s2[j + PART_YVEL] < 0.0) {		
                // collision! floor...  
                this.s2[j + PART_YPOS] = -0.9;// 1) resolve contact: put particle at wall.
                this.s2[j + PART_YVEL] = this.s1[j + PART_YVEL];	// 2a) undo velocity change:
                this.s2[j + PART_YVEL] *= this.drag;		          // 2b) apply drag:	
                // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
                // ATTENTION! VERY SUBTLE PROBLEM HERE!
                // need a velocity-sign test here that ensures the 'bounce' step will 
                // always send the ball outwards, away from its wall or floor collision.
                if (this.s2[j + PART_YVEL] < 0.0)
                    this.s2[j + PART_YVEL] = -this.resti * this.s2[j + PART_YVEL]; // need sign change--bounce!
                else
                    this.s2[j + PART_YVEL] = this.resti * this.s2[j + PART_YVEL];	// sign changed-- don't need another.
            }
            //--------  ceiling (+Y) wall  ------------------------------------------
            else if (this.s2[j + PART_YPOS] > 0.9) { // && this.s2[j + PART_YVEL] > 0.0) {
                // collision! ceiling...
                this.s2[j + PART_YPOS] = 0.9;// 1) resolve contact: put particle at wall.
                this.s2[j + PART_YVEL] = this.s1[j + PART_YVEL];	// 2a) undo velocity change:
                this.s2[j + PART_YVEL] *= this.drag;			        // 2b) apply drag:
                // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
                // ATTENTION! VERY SUBTLE PROBLEM HERE!
                // need a velocity-sign test here that ensures the 'bounce' step will 
                // always send the ball outwards, away from its wall or floor collision.
                if (this.s2[j + PART_YVEL] > 0.0)
                    this.s2[j + PART_YVEL] = -this.resti * this.s2[j + PART_YVEL]; // need sign change--bounce!
                else
                    this.s2[j + PART_YVEL] = this.resti * this.s2[j + PART_YVEL];	// sign changed-- don't need another.
            }
            //--------  near (-Z) wall  --------------------------------------------- 
            if (this.s2[j + PART_ZPOS] < -0.9) { // && this.s2[j + PART_ZVEL] < 0.0 ) {
                // collision! 
                this.s2[j + PART_ZPOS] = -0.9;// 1) resolve contact: put particle at wall.
                this.s2[j + PART_ZVEL] = this.s1[j + PART_ZVEL];  // 2a) undo velocity change:
                this.s2[j + PART_ZVEL] *= this.drag;			        // 2b) apply drag:
                // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
                // ATTENTION! VERY SUBTLE PROBLEM HERE! ------------------------------
                // need a velocity-sign test here that ensures the 'bounce' step will 
                // always send the ball outwards, away from its wall or floor collision. 
                if (this.s2[j + PART_ZVEL] < 0.0)
                    this.s2[j + PART_ZVEL] = -this.resti * this.s2[j + PART_ZVEL]; // need sign change--bounce!
                else
                    this.s2[j + PART_ZVEL] = this.resti * this.s2[j + PART_ZVEL];	// sign changed-- don't need another.
            }
            //--------  far (+Z) wall  ---------------------------------------------- 
            else if (this.s2[j + PART_ZPOS] > 0.9) { // && this.s2[j + PART_ZVEL] > 0.0) {	
                // collision! 
                this.s2[j + PART_ZPOS] = 0.9; // 1) resolve contact: put particle at wall.
                this.s2[j + PART_ZVEL] = this.s1[j + PART_ZVEL];  // 2a) undo velocity change:
                this.s2[j + PART_ZVEL] *= this.drag;			        // 2b) apply drag:

                if (this.s2[j + PART_ZVEL] > 0.0)
                    this.s2[j + PART_ZVEL] = -this.resti * this.s2[j + PART_ZVEL]; // need sign change--bounce!
                else
                    this.s2[j + PART_ZVEL] = this.resti * this.s2[j + PART_ZVEL];	// sign changed-- don't need another.
            } // end of (+Z) wall constraint
        } // end of for-loop for all particles
    } // end of bounceType==1 
    else {
        console.log('?!?! unknown constraint: PartSys.bounceType==' + this.bounceType);
        return;
    }

}

PartSys.prototype.swap = function () {
    /*
    exchanges the contents of s1 and s2 by swapping their references
    */
    this.s1.set(this.s2);
}

PartSys.prototype.roundRand = function () {
    /*
    monte carlo sampling pts on unit sphere
    */
    do {
        this.randX = 2.0 * Math.random() - 1.0; // [-1,1]
        this.randY = 2.0 * Math.random() - 1.0;
        this.randZ = 2.0 * Math.random() - 1.0;
    }
    while (this.randX * this.randX +
    this.randY * this.randY +
    this.randZ * this.randZ >= 1.0);
}