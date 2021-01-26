
/*==============================================================================
================================================================================

                              CLimit Library

================================================================================
================================================================================
Each object of type 'CLimit' fully describe just one constraint on particles in
our particle system (e.g. axis-aligned walls, ceiling, floor; 'age' constraint
to re-init and re-launch 'old' particles at their end-of-life (see 'fountain'),
'lock' constraints that keep a particle fixed at one 3D position (useful for the
ends of spring-mass rope) or limited to a plane or a line for sliding contact).
    Just like CForcer objects, we make an array of these CLimit objects inside
each particle-system object (e.g. PartSys.limitList[]) and use only the CLimit
objects in that array in the 'PartSys.doConstraints()' member function.
IMPORTANT CONSTANTS:
------'hitType' values-------------
      Each 'CLimit' object contains a 'hitType' member variable whose value
      selects how particle(s) will respond to collisions with a constraint:
*/
const HIT_STOP  = 0;      // if particle goes past constraint (e.g. thru a wall)
                          // re-set position to meet constraint, and
                          // re-set its (x,y,z) velocity to zero.
const HIT_SLIDE = 1;      // re-set position to meet constraint, and
                          // remove all velocity in the surface-normal direction.
const HIT_BOUNCE_VEL = 2; // 'bounce' using coef. of restitution (resti) and
                          // simple/basic/naive velocity reversal method. (Note
                          // 'bouncy' particles may never reach zero velocity)
const HIT_BOUNCE_IMP = 3; // 'bounce' using coef. of restitiion (resti) and
                          // impulsive method that enables a 'bouncy' particle
                          // to come to rest (no velocity) on a surface (floor).
/*
--------'limitType' values-------------
        Each 'CLimit' object contains a 'limitType' member variable whose value
        selects the kind of constraint that the object describes from these:
*/
const LIM_NONE    = 0;    // non-existent, disabled, or unused constraint object: 
                          // (may be available for re-use).
        // NOTE: any limitType value < 0 causes LIM_NONE result; THUS you can
        //      ***negate limitType*** to temporarily disable a CLimit object.
        //      (quite useful for debugging  and for novel user controls...)
const LIM_VOL     = 1;    // Keeps particles INSIDE or OUTSIDE the axis-aligned 
                          // rectangular volume specified by xMin, xMax, yMin,
                          // yMax,zMin,zMax members. Set xMin < xMax to keep
                          // affected particles INSIDE the range [xMin,xMax],
                          // and xMin > xMax to keep them OUTSIDE that range.
                          // Expect strange results if you mix inside/outside.
                          // (CAREFUL! not a thin-walled box! no particle set to
                          //  stay INSIDE this constraint can exist outside it!)
const LIM_WALL    = 2;    // Prevents particles from passing through a 2-sided 
                          // wall that is rectangular, flat/2D, axis-aligned,
                          // zero thickness, at any desired position. Defined by
                          // xMin,xMax,yMin,yMax,zMin,zMax members;  set min/max
                          // pair to same value to define wall orientation.
                          // (For example, for wall at z=2, set zMin=zMax=2.) 
const LIM_BOX     = 3;    // Creates an axis-aligned rectangular 'box' made of
                          // zero-thickness 'walls' that prevent particles from 
                          // passing though from either side.  Box defined by
                          // xMin,xMax,yMin,yMax,zMin,zMax members. 
const LIM_MAT_WALL= 4;    // Matrix-transformed wall; prevents particles from 
                          // passing through rectangular wall of specified size, 
                          // position, & orientation. Orthonormal Matrix4 member 
                          // 'poseMatrix' transforms 'world' drawing axes to 
                          // our own 'pose' axes where we define this 2-sided
                          // wall using xMin,xMax,yMin,yMax,zMin,zMax members;
                          // (You can change default zMin=zMax=0 if you wish, 
                          //                        but please keep zMin=zMax)   
const LIM_MAT_DISC= 5;    // Matrix-transformed disc-shaped wall; prevents
                          // particles from passing through circular flat wall
                          // of specified size, position, & orientation. Ortho-
                          // normal Matrix4 member 'poseMatrix' transforms 
                          // 'world' drawing axes to our own 'pose' drawing axes
                          // where z=0 disc set by xCtr,yCtr,radMax members.                            
const LIM_BALL_OUT= 6;    // A spherical region defined in world coords by
                          // xCtr,yCtr,zCtr,radMax mambers that requires all
                          // affected particles to stay OUTSIDE the sphere.
                          // (CAREFUL! not a thin-walled ball! no particle set
                          // to stay OUTSIDE the sphere can move to its interior!)
const LIM_BALL_IN = 7;    // A spherical region defined in world coords by
                          // xCtr,yCtr,zCtr,radMax members that requires all 
                          // affected particles to stay INSIDE the sphere.
                          // (CAREFUL! not a thin-walled ball! no particle set 
                          //  stay INSIDE the sphere can move outside of it!)
// You could continue this with other shapes too: LIM_CYL_IN, LIM_CYL_OUT for 
// cylinder volumes; LIM_CYL_WALL for cylindrical container LIM_MAT_CYL for 
// transformed cylinder wall, etc.

// Distance constraints:
const LIM_ANCHOR  = 8;    // Keep specified particle(s) at world-space location
                          // xMin, yMin, zMin.
const LIM_SLOT    = 9;    // Limit specified particles(s) positions to stay
                          // within xMin,xMax,yMin,yMax,yMin,zMax (for example,
                          // xMin=0, xMax=1, yMin=yMax=5; zMin=zMax=3; would
                          // allow particle to 'slide' along line segment in x.
const LIM_ROD     = 10;   // Connects 2 particles with fixed-length separation
                          // between particles whose indices are held in e0,e1
                          // (e.g. particles at pS0[e0] and pS0[e1] )
const LIM_ROPE    = 11;   // Prevent 2 particles selected by members e0,e1 from 
                          // separating by more than distance 'radMax';
const LIM_PULLEY  = 12;   // Keep constant sum-of-distances for 3 particles
                          // A,B,Pivot:  ||A-Pivot||+||B-Pivot|| = dmax.
const LIM_MAXVAR  = 13;   // Max number of possible limitType values available.

//=============================================================================
//==============================================================================
function CLimit() {
//==============================================================================
//=============================================================================
// Constructor for a new 'limit' object -- a constraint-applying object.
  this.limitType = LIM_NONE;       // initially no constraint at all.
  this.hitType = HIT_BOUNCE_IMP;   // but set for impulsive collision/bounce
  this.isVisible = true;     // if true, draw this constraint on-screen
  
  this.Kresti = 1.0;        // Coeff. of restoration for constraint surfaces:
                            // Particles moving at speed ||V|| will bounce off
                            // a constraint surface and lose some energy; after
                            // the bounce, speed is ||V||*Kbouncy.
                            //   0.0 <= Kbouncy <= 1.0;     'no bounce'== 0.0;
                            //                          'perfect bounce'==1.0.
  
  // Specify which particles are constrained by this CLimit object:
  this.partFirst =  0;      // particle-number (count from 0 in state variable)
                            // of the first particle constrained by this CLimit;
  this.partCount = -1;      // Number of sequential particles in state variable
                            // constrained by this CLimit object. To select ALL
                            // particles from 'partFirst' on, set partCount < 0.
                            // For pairs of particles chosen by e0,e1 below,
                            // set partCount=0.
  this.e0 = 0; this.e1 = 1; // particle-number (count from 0 in state variable)
                            // of the 2 particles constrained by this CLimit.

  this.xMin = 0;   this.xMax = 0;         // define axis-aligned volume or box
  this.yMin = 0;   this.yMax = 0;
  this.zMin = 0;   this.zMax = 0;
  this.xCtr = 0;   this.yCtr = 0;  this.zCtr = 0;  // sphere or disc center location
  this.radMax = 1;             // sphere or disk radius
  this.poseMatrix = new Matrix4(); // Orthonormal matrix (translate,rotate ONLY:
                                  // NO SCALING!) that transforms world drawing 
                                  // axes to 'pose' axes where we define 'wall'
                                  // and other non-axis-aligned constraints.
}
