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

var g_currSolverType = 4;

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

    this.a_ptSizeID = gl.getAttribLocation(this.shaderLoc, 'a_ptSize');
    if (this.a_ptSizeID < 0) {
        console.log('PartSys.init() Failed to get a_ptSize variable location');
        return;
    }

    this.u_runModeID = gl.getUniformLocation(this.shaderLoc, 'u_runMode');
    if (!this.u_runModeID) {
        console.log('PartSys.init() Failed to get u_runMode variable location');
        return;
    }


}

PartSys.prototype.initSpring = function (count) {
    console.log('spring mass now');
    // ! force-causing objects
    var fTmp = new CForcer();       // create a NEW CForcer object 
    fTmp.forceType = F_SPRING;
    fTmp.e1 = 0;
    fTmp.e2 = 1;
    fTmp.K_spring = 50.0;
    fTmp.K_springDamp = 0.8;
    fTmp.K_restLength = 1; //spring equalibrium
    fTmp.targFirst = 0;
    fTmp.partCount = -1;
    this.forceList.push(fTmp);

    fTmp = new CForcer();       // create a NEW CForcer object 
    fTmp.forceType = F_DRAG;
    fTmp.Kdrag = fTmp.K_springDamp;
    fTmp.targFirst = 0;             // apply it to ALL particles:
    fTmp.partCount = -1;
    this.forceList.push(fTmp);

    console.log("\t\t", this.forceList.length, "CForcer objects:");
    for (i = 0; i < this.forceList.length; i++) {
        console.log("CForceList[", i, "]");
        this.forceList[i].printMe();
    }
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
    this.solvType = SOLV_MIDPOINT;
    this.bounceType = 1;

    //* initial conditions y0
    var j = 0;
    for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
        this.roundRand(); // * y(0)
        this.s1[j + PART_XPOS] = (i % 2 == 1) ? 0.2 : -0.2;
        this.s1[j + PART_YPOS] = 0.0;
        this.s1[j + PART_ZPOS] = 0.0;
        this.s1[j + PART_WPOS] = 1.0;
        this.s1[j + PART_R] = 0.9;
        this.s1[j + PART_G] = 0.5 + Math.abs(this.randY) * 0.5;
        this.s1[j + PART_B] = Math.abs(this.randZ);
        this.roundRand(); // * y'(0)
        this.s1[j + PART_XVEL] = 0.0;
        this.s1[j + PART_YVEL] = 0.0;
        this.s1[j + PART_ZVEL] = 0.0;
        this.s1[j + PART_DIAM] = 10;
        this.s1[j + PART_MASS] = this.s1[j + PART_DIAM];
        this.s1[j + PART_RENDMODE] = 0.0;
        this.s1[j + PART_AGE] = 10;
        this.s2.set(this.s1);
    }
    this.FSIZE = this.s1.BYTES_PER_ELEMENT;
}

PartSys.prototype.initBouncy3D = function (count) {
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
    this.solvType = g_currSolverType;
    this.bounceType = 1;

    //* initial conditions
    var j = 0;
    for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
        this.roundRand(); // * y(0)
        this.s1[j + PART_XPOS] = -0.8 + 0.1 * this.randX;
        this.s1[j + PART_YPOS] = -0.8 + 0.1 * this.randY;
        this.s1[j + PART_ZPOS] = -0.8 + 0.1 * this.randZ;
        this.s1[j + PART_WPOS] = 1.0;
        this.s1[j + PART_R] = Math.abs(this.randX);
        this.s1[j + PART_G] = Math.abs(this.randY);
        this.s1[j + PART_B] = 0.9;
        this.roundRand(); // * y'(0)
        this.s1[j + PART_XVEL] = this.INIT_VEL * (0.4 + 0.2 * this.randX);
        this.s1[j + PART_YVEL] = this.INIT_VEL * (0.4 + 0.2 * this.randY);
        this.s1[j + PART_ZVEL] = this.INIT_VEL * (0.4 + 0.2 * this.randZ);
        this.s1[j + PART_DIAM] = 40 * Math.random(); // on-screen diameter, in pixels
        this.s1[j + PART_MASS] = this.s1[j + PART_DIAM];
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
        PART_MAXVAR * this.FSIZE, PART_R * this.FSIZE);
    gl.enableVertexAttribArray(this.a_ColorID);

    gl.vertexAttribPointer(this.a_ptSizeID, 1, gl.FLOAT, false,
        PART_MAXVAR * this.FSIZE, PART_DIAM * this.FSIZE);
    gl.enableVertexAttribArray(this.a_ptSizeID);

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
    var j = 0;  // i==particle number; j==array index for i-th particle
    for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
        s[j + PART_X_FTOT] = 0.0;
        s[j + PART_Y_FTOT] = 0.0;
        s[j + PART_Z_FTOT] = 0.0;
    }
    for (var k = 0; k < fList.length; k++) {  // for every CForcer in fList array,
        //    console.log("fList[k].forceType:", fList[k].forceType);
        if (fList[k].forceType <= 0) {     //.................Invalid force? SKIP IT!
            // if forceType is F_NONE, or if forceType was 
            continue;         // negated to (temporarily) disable the CForcer,
        }

        var m = fList[k].targFirst;   // first affected particle # in our state 's'
        var mmax = this.partCount;    // Total number of particles in 's'
        // (last particle number we access is mmax-1)
        if (fList[k].targCount == 0) {    // ! Apply force to e1,e2 particles only!
            m = mmax = 0;   // don't let loop run; apply force to e1,e2 particles only.
        }
        else if (fList[k].targCount > 0) {
            // YES! force applies to 'targCount' particles starting with particle # m:
            var tmp = fList[k].targCount;
            if (tmp < mmax) mmax = tmp;    // (but MAKE SURE mmax doesn't get larger)
            else console.log("\n\n!!PartSys.applyForces() index error!!\n\n");
        }
        // console.log("m:",m,"mmax:",mmax);
        // m and mmax are now correctly initialized; use them!  
        switch (fList[k].forceType) {
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
            case F_GRAV_P:    // planetary gravity between particle # e1 and e2.
                console.log("PartSys.applyForces(), fList[", k, "].forceType:",
                    fList[k].forceType, "NOT YET IMPLEMENTED!!");
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
            case F_DRAG:      // viscous drag: force = -K_drag * velocity.
                var j = m * PART_MAXVAR;  // state var array index for particle # m
                for (; m < mmax; m++, j += PART_MAXVAR) { // for every particle# from m to mmax-1,
                    // force from gravity == mass * gravConst * downDirection
                    s[j + PART_X_FTOT] -= (fList[k].K_drag + 10) * s[j + PART_XVEL];
                    s[j + PART_Y_FTOT] -= (fList[k].K_drag + 10) * s[j + PART_YVEL];
                    s[j + PART_Z_FTOT] -= (fList[k].K_drag + 10) * s[j + PART_ZVEL];
                }
                break;
            case F_SPRING:
                // fTmp.e1 = 0;              
                // fTmp.e2 = 1;             
                // fTmp.K_spring = 100.0;             
                // fTmp.K_springDamp = 0.8;          
                // fTmp.K_restLength = 0.3;      
                // 𝑚𝑥¨1=−𝑘(𝑥1−𝑥2+𝑙) https://physics.stackexchange.com/questions/61809/two-masses-attached-to-a-spring
                // 𝑚𝑥¨2=−𝑘(𝑥2−𝑥1−𝑙)
                //get mass 1 and mass 2
                let m1 = s.slice(0, fList[k].e2 * PART_MAXVAR);
                let m2 = s.slice(fList[k].e2 * PART_MAXVAR, s.length);
                //calculate x1 - x2
                let eucDist = Math.sqrt(Math.pow(m1[PART_XPOS] - m2[PART_XPOS], 2)
                    + Math.pow(m1[PART_YPOS] - m2[PART_YPOS], 2)
                    + Math.pow(m1[PART_ZPOS] - m2[PART_ZPOS], 2));
                var j = m * PART_MAXVAR; //* Note: -1*(1-2*m) map {0,1} to {-1,1} indicating the sign
                for (; m < mmax; m++, j += PART_MAXVAR) {
                    s[j + PART_X_FTOT] = -1 * fList[k].K_spring *
                        (eucDist * (1 - 2 * m) + fList[k].K_restLength * (1 - 2 * m))
                        * (m2[PART_XPOS] - m1[PART_XPOS]) / eucDist;
                    s[j + PART_Y_FTOT] = -1 * fList[k].K_spring *
                        ( eucDist * (1 - 2 * m)  + fList[k].K_restLength * (1 - 2 * m)) 
                        * (m2[PART_YPOS] - m1[PART_YPOS])/eucDist;
                    s[j + PART_Z_FTOT] = -1 * fList[k].K_spring *
                        ( eucDist * (1 - 2 * m)  + fList[k].K_restLength * (1 - 2 * m))
                        * (m2[PART_ZPOS] - m1[PART_ZPOS])/eucDist;
                }
                break;
            case F_SPRINGSET:
                console.log("PartSys.applyForces(), fList[", k, "].forceType:",
                    fList[k].forceType, "NOT YET IMPLEMENTED!!");
                break;
            case F_CHARGE:
                console.log("PartSys.applyForces(), fList[", k, "].forceType:",
                    fList[k].forceType, "NOT YET IMPLEMENTED!!");
                break;
            default:
                console.log("!!!ApplyForces() fList[", k, "] invalid forceType:", fList[k].forceType);
                break;
        } // switch(fList[k].forceType)
    } // for(k=0...)
}

PartSys.prototype.dotFinder = function (dest, src) {
    /* 
    numerical differentiation for time derivative
    src -> given y'(0) (& y''(0) from applyForce())
    dest -> compute y(1) & y'(1)
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
        dest[j + PART_R] = 0.0;       // presume color doesn't change with time.
        dest[j + PART_G] = 0.0;
        dest[j + PART_B] = 0.0;
        dest[j + PART_MASS] = 0.0;    // presume mass doesn't change with time.
        dest[j + PART_DIAM] = 0.0;    // presume these don't change either...   
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
            //y(j,1)=y(j-1,1)+h*f(x(j-1,1),y(j-1,1));
            for (var n = 0; n < this.s1.length; n++) { // for all elements in s1,s2,s1dot;
                this.s2[n] = this.s1[n] + this.s1dot[n] * (g_timeStep * 0.001);
            }
            break;
        case SOLV_MIDPOINT:
            /* y_{k+1/2} = y_k + h/2 * f(t_k, y_k) */
            let s_half = this.s1;
            this.eulerMethod(s_half, this.s1, this.s1dot, (g_timeStep * 0.001) / 2);
            this.applyForces(s_half, this.forceList);  // find current net force on each particle
            let s_halfDot = new Float32Array(this.partCount * PART_MAXVAR);
            this.dotFinder(s_halfDot, s_half);
            /* y_{k+1} = y_k + h * f(t_{k+1/2}, y_{k+1/2}) */
            var j = 0;
            for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
                this.s2[j + PART_XPOS] += s_halfDot[j + PART_XPOS] * (g_timeStep * 0.001);
                this.s2[j + PART_YPOS] += s_halfDot[j + PART_YPOS] * (g_timeStep * 0.001);
                this.s2[j + PART_ZPOS] += s_halfDot[j + PART_ZPOS] * (g_timeStep * 0.001);
                this.s2[j + PART_XVEL] += s_halfDot[j + PART_XVEL] * (g_timeStep * 0.001);
                this.s2[j + PART_YVEL] += s_halfDot[j + PART_YVEL] * (g_timeStep * 0.001);
                this.s2[j + PART_ZVEL] += s_halfDot[j + PART_ZVEL] * (g_timeStep * 0.001);
            }
            break;
        case SOLV_ADAMS_BASH:
            /*
            https://en.wikipedia.org/wiki/Linear_multistep_method
            y_{n+2} = y_{n+1} + 3/2*h*f(t_{n+1},y_{n+1}) - 1/2 * h * f(t_n, y_n)
            s1(n), s_mid(n+1) [computed by Euler], s2(n+2)
            */
            let s_mid = this.s1;
            var j = 0;
            for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
                s_mid[j + PART_XPOS] += this.s1dot[j + PART_XPOS] * (g_timeStep * 0.001);
                s_mid[j + PART_YPOS] += this.s1dot[j + PART_YPOS] * (g_timeStep * 0.001);
                s_mid[j + PART_ZPOS] += this.s1dot[j + PART_ZPOS] * (g_timeStep * 0.001);
                s_mid[j + PART_XVEL] += this.s1dot[j + PART_XVEL] * (g_timeStep * 0.001);
                s_mid[j + PART_YVEL] += this.s1dot[j + PART_YVEL] * (g_timeStep * 0.001);
                s_mid[j + PART_ZVEL] += this.s1dot[j + PART_ZVEL] * (g_timeStep * 0.001);
            }
            this.applyForces(s_mid, this.forceList);  // find current net force on each particle
            let s_midDot = new Float32Array(this.partCount * PART_MAXVAR);
            this.dotFinder(s_midDot, s_mid);
            var j = 0;
            for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
                this.s2[j + PART_XPOS] = s_mid[j + PART_XPOS]
                    + 3 / 2 * (g_timeStep * 0.001) * s_midDot[j + PART_XPOS]
                    - 1 / 2 * (g_timeStep * 0.001) * this.s1dot[j + PART_XPOS];
                this.s2[j + PART_YPOS] = s_mid[j + PART_YPOS]
                    + 3 / 2 * (g_timeStep * 0.001) * s_midDot[j + PART_YPOS]
                    - 1 / 2 * (g_timeStep * 0.001) * this.s1dot[j + PART_YPOS];
                this.s2[j + PART_ZPOS] = s_mid[j + PART_ZPOS]
                    + 3 / 2 * (g_timeStep * 0.001) * s_midDot[j + PART_ZPOS]
                    - 1 / 2 * (g_timeStep * 0.001) * this.s1dot[j + PART_ZPOS];
                this.s2[j + PART_XVEL] = s_mid[j + PART_XVEL]
                    + 3 / 2 * (g_timeStep * 0.001) * s_midDot[j + PART_XVEL]
                    - 1 / 2 * (g_timeStep * 0.001) * this.s1dot[j + PART_XVEL];
                this.s2[j + PART_YVEL] = s_mid[j + PART_YVEL]
                    + 3 / 2 * (g_timeStep * 0.001) * s_midDot[j + PART_YVEL]
                    - 1 / 2 * (g_timeStep * 0.001) * this.s1dot[j + PART_YVEL];
                this.s2[j + PART_ZVEL] = s_mid[j + PART_ZVEL]
                    + 3 / 2 * (g_timeStep * 0.001) * s_midDot[j + PART_ZVEL]
                    - 1 / 2 * (g_timeStep * 0.001) * this.s1dot[j + PART_ZVEL];
            }
            break;
        case SOLV_RUNGEKUTTA:
            /* 4th order
            ref: Greenbaum, Numerical Methods Design Analysis(Page 300, equation 11.22)
            */
            // * q2 = F(x(i)+0.5*h, y(i)+0.5*h*q1); 
            let s_half1 = this.s1;
            var j = 0;
            for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
                s_half1[j + PART_XPOS] += 0.5 * (g_timeStep * 0.001) * this.s1dot[j + PART_XPOS];
                s_half1[j + PART_YPOS] += 0.5 * (g_timeStep * 0.001) * this.s1dot[j + PART_YPOS];
                s_half1[j + PART_ZPOS] += 0.5 * (g_timeStep * 0.001) * this.s1dot[j + PART_ZPOS];
                s_half1[j + PART_XVEL] += 0.5 * (g_timeStep * 0.001) * this.s1dot[j + PART_XVEL];
                s_half1[j + PART_YVEL] += 0.5 * (g_timeStep * 0.001) * this.s1dot[j + PART_YVEL];
                s_half1[j + PART_ZVEL] += 0.5 * (g_timeStep * 0.001) * this.s1dot[j + PART_ZVEL];
            }
            this.applyForces(s_half1, this.forceList);  // find y'
            let s_half1Dot = new Float32Array(this.partCount * PART_MAXVAR);
            this.dotFinder(s_half1Dot, s_half1); //find f
            // * q3 = F(x(i)+0.5*h, y(i)+0.5*h*q2); 
            let s_half2 = this.s1;
            var j = 0;
            for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
                s_half2[j + PART_XPOS] += 0.5 * (g_timeStep * 0.001) * s_half1Dot[j + PART_XPOS];
                s_half2[j + PART_YPOS] += 0.5 * (g_timeStep * 0.001) * s_half1Dot[j + PART_YPOS];
                s_half2[j + PART_ZPOS] += 0.5 * (g_timeStep * 0.001) * s_half1Dot[j + PART_ZPOS];
                s_half2[j + PART_XVEL] += 0.5 * (g_timeStep * 0.001) * s_half1Dot[j + PART_XVEL];
                s_half2[j + PART_YVEL] += 0.5 * (g_timeStep * 0.001) * s_half1Dot[j + PART_YVEL];
                s_half2[j + PART_ZVEL] += 0.5 * (g_timeStep * 0.001) * s_half1Dot[j + PART_ZVEL];
            }
            this.applyForces(s_half2, this.forceList);  // find y'
            let s_half2Dot = new Float32Array(this.partCount * PART_MAXVAR);
            this.dotFinder(s_half2Dot, s_half2); //find f
            // * q4 = F(x(i)+h, y(i)+h*q3); 
            let s_half3 = this.s1;
            var j = 0;
            for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
                s_half3[j + PART_XPOS] += (g_timeStep * 0.001) * s_half2Dot[j + PART_XPOS];;
                s_half3[j + PART_YPOS] += (g_timeStep * 0.001) * s_half2Dot[j + PART_YPOS];;
                s_half3[j + PART_ZPOS] += (g_timeStep * 0.001) * s_half2Dot[j + PART_ZPOS];;
                s_half3[j + PART_XVEL] += (g_timeStep * 0.001) * s_half2Dot[j + PART_XVEL];
                s_half3[j + PART_YVEL] += (g_timeStep * 0.001) * s_half2Dot[j + PART_YVEL];
                s_half3[j + PART_ZVEL] += (g_timeStep * 0.001) * s_half2Dot[j + PART_ZVEL];
            }
            this.applyForces(s_half3, this.forceList);  // find y'
            let s_half3Dot = new Float32Array(this.partCount * PART_MAXVAR);
            this.dotFinder(s_half3Dot, s_half3); //find f
            // * y2 = y1 + h/6*[q1 + 2q2 + 2q3 + q4]
            var j = 0;
            for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
                this.s2[j + PART_XPOS] = this.s1[j + PART_XPOS] + (g_timeStep * 0.001) / 6
                    * (this.s1dot[j + PART_XPOS] + 2 * s_half1Dot[j + PART_XPOS] + 2 * s_half2Dot[j + PART_XPOS] + s_half3Dot[j + PART_XPOS]);
                this.s2[j + PART_YPOS] = this.s1[j + PART_YPOS] + (g_timeStep * 0.001) / 6
                    * (this.s1dot[j + PART_YPOS] + 2 * s_half1Dot[j + PART_YPOS] + 2 * s_half2Dot[j + PART_YPOS] + s_half3Dot[j + PART_YPOS]);
                this.s2[j + PART_ZPOS] = this.s1[j + PART_ZPOS] + (g_timeStep * 0.001) / 6
                    * (this.s1dot[j + PART_ZPOS] + 2 * s_half1Dot[j + PART_ZPOS] + 2 * s_half2Dot[j + PART_ZPOS] + s_half3Dot[j + PART_ZPOS]);

                this.s2[j + PART_XVEL] = this.s1[j + PART_XVEL] + (g_timeStep * 0.001) / 6
                    * (this.s1dot[j + PART_XVEL] + 2 * s_half1Dot[j + PART_XVEL] + 2 * s_half2Dot[j + PART_XVEL] + s_half3Dot[j + PART_XVEL]);
                this.s2[j + PART_YVEL] = this.s1[j + PART_YVEL] + (g_timeStep * 0.001) / 6
                    * (this.s1dot[j + PART_YVEL] + 2 * s_half1Dot[j + PART_YVEL] + 2 * s_half2Dot[j + PART_YVEL] + s_half3Dot[j + PART_YVEL]);
                this.s2[j + PART_ZVEL] = this.s1[j + PART_ZVEL] + (g_timeStep * 0.001) / 6
                    * (this.s1dot[j + PART_ZVEL] + 2 * s_half1Dot[j + PART_ZVEL] + 2 * s_half2Dot[j + PART_ZVEL] + s_half3Dot[j + PART_ZVEL]);
            }
            break;
        case SOLV_OLDGOOD: // IMPLICIT or 'reverse time' solver inverse euler
            var j = 0;
            for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
                this.s2[j + PART_YVEL] -= this.grav * (g_timeStep * 0.001);
                this.s2[j + PART_XVEL] *= this.drag;
                this.s2[j + PART_YVEL] *= this.drag;
                this.s2[j + PART_ZVEL] *= this.drag;
                this.s2[j + PART_XPOS] += this.s2[j + PART_XVEL] * (g_timeStep * 0.001);
                this.s2[j + PART_YPOS] += this.s2[j + PART_YVEL] * (g_timeStep * 0.001);
                this.s2[j + PART_ZPOS] += this.s2[j + PART_ZVEL] * (g_timeStep * 0.001);
            }
            break;
        case SOLV_BACK_EULER:
            /* 
            https://en.wikipedia.org/wiki/Backward_Euler_method
            solve an algebraic equation for the unknown y_{k+1}
            w'=w(i)+h*f(t(i),w(i));
            w(i+1)=w(i)+h*f(t(i+1),w');
            */
            let s_mid_backE = this.s1;
            this.eulerMethod(s_mid_backE, this.s1, this.s1dot, g_timeStep * 0.001);
            var j = 0;
            for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
                this.applyForces(s_mid_backE, this.forceList);
                let s_mid_backEDot = new Float32Array(this.partCount * PART_MAXVAR);
                this.dotFinder(s_mid_backEDot, s_mid_backE);
                // this.s2[j + PART_XPOS] = this.s1[j + PART_XPOS] +
            }
        case SOLV_VERLET:
            /* https://en.wikipedia.org/wiki/Verlet_integration 
            x_{n+1} = 2*x_n - x_{n-1} + 1/2at^2
            */
            //one step backward (minus the gradient) & one step forward
            let s_mid_verlet = this.s1;
            var j = 0;
            for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
                s_mid_verlet[j + PART_XPOS] = this.s1[j + PART_XPOS] - this.s1dot[j + PART_XPOS] * (g_timeStep * 0.001)
                    + 1 / 2 * this.s1dot[j + PART_XVEL] * Math.pow(g_timeStep * 0.001, 2);
                s_mid_verlet[j + PART_YPOS] = this.s1[j + PART_YPOS] - this.s1dot[j + PART_YPOS] * (g_timeStep * 0.001)
                    + 1 / 2 * this.s1dot[j + PART_XVEL] * Math.pow(g_timeStep * 0.001, 2);
                s_mid_verlet[j + PART_ZPOS] = this.s1[j + PART_ZPOS] - this.s1dot[j + PART_ZPOS] * (g_timeStep * 0.001)
                    + 1 / 2 * this.s1dot[j + PART_XVEL] * Math.pow(g_timeStep * 0.001, 2);
                // s_mid_verlet[j + PART_XVEL] += this.s1[j + PART_XVEL] * (g_timeStep * 0.001);
                // s_mid_verlet[j + PART_YVEL] += this.s1[j + PART_YVEL] * (g_timeStep * 0.001);
                // s_mid_verlet[j + PART_ZVEL] += this.s1[j + PART_ZVEL] * (g_timeStep * 0.001);
            }
            this.applyForces(s_mid_verlet, this.forceList);  // find y'
            let s_midDot_verlet = new Float32Array(this.partCount * PART_MAXVAR);
            this.dotFinder(s_midDot_verlet, s_mid_verlet); //find f
            var j = 0;
            for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
                this.s2[j + PART_XPOS] = 2 * s_mid_verlet[j + PART_XPOS] - this.s1[j + PART_XPOS]
                    + s_midDot_verlet[j + PART_XVEL] * Math.pow(g_timeStep * 0.001, 2);
                this.s2[j + PART_YPOS] = 2 * s_mid_verlet[j + PART_YPOS] - this.s1[j + PART_YPOS]
                    + s_midDot_verlet[j + PART_YVEL] * Math.pow(g_timeStep * 0.001, 2);
                this.s2[j + PART_ZPOS] = 2 * s_mid_verlet[j + PART_ZPOS] - this.s1[j + PART_ZPOS]
                    + s_midDot_verlet[j + PART_ZVEL] * Math.pow(g_timeStep * 0.001, 2);
                this.s2[j + PART_XVEL] += s_midDot_verlet[j + PART_XVEL] * (g_timeStep * 0.001);
                this.s2[j + PART_YVEL] += s_midDot_verlet[j + PART_YVEL] * (g_timeStep * 0.001);
                this.s2[j + PART_ZVEL] += s_midDot_verlet[j + PART_ZVEL] * (g_timeStep * 0.001);
            }
            break;
        default:
            console.log('?!?! unknown solver: g_partA.solvType==' + this.solvType);
            break;
    }
    return;
}

PartSys.prototype.eulerMethod = function (s2, s1, s1dot, h) {
    /* a way calculate the next step to start*/
    var j = 0;
    for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
        s2[j + PART_XPOS] = s1[j + PART_XPOS] + s1dot[j + PART_XPOS] * h;
        s2[j + PART_YPOS] = s1[j + PART_YPOS] + s1dot[j + PART_YPOS] * h;
        s2[j + PART_ZPOS] = s1[j + PART_ZPOS] + s1dot[j + PART_ZPOS] * h;
        s2[j + PART_XVEL] = s1[j + PART_XVEL] + s1dot[j + PART_XVEL] * h;
        s2[j + PART_YVEL] = s1[j + PART_YVEL] + s1dot[j + PART_YVEL] * h;
        s2[j + PART_ZVEL] = s1[j + PART_ZVEL] + s1dot[j + PART_ZVEL] * h;
    }
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