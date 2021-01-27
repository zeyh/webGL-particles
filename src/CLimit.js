
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
*/
//------'hitType' values-------------
//    Each 'CLimit' object contains a 'hitType' member variable whose value
//    selects how particle(s) will respond to collisions with a constraint:
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

//------'limitType' values-------------
//      Each 'CLimit' object contains a 'limitType' member variable whose value
//      selects the kind of constraint that the object describes from these:
const LIM_NONE    = 0;    // non-existent, disabled, or unused constraint object: 
                          // (may be available for re-use).
        // NOTE: any limitType value < 0 causes LIM_NONE result; THUS you can
        //      ***negate limitType*** to temporarily disable a CLimit object.
        //      (quite useful for debugging  and for novel user controls...)
const LIM_VOL     = 1;    // Keeps particles INSIDE or OUTSIDE the axis-aligned 
                          // rectangular volume specified by xMin, xMax, yMin,
                          // yMax,zMin,zMax members. To keep particles INSIDE
                          // the volume, set xMin<xMax, yMin<yMax, zMin<zMax;
                          // to keep them OUTSIDE: xMin>xMax,yMin>yMax,zMin>zMax
                          // You may choose inside/outside separately for each
                          // axis, but expect strange results; think carefully.
                          // (CAREFUL! not a thin-walled box! no particle set to
                          //  stay INSIDE this constraint can exist outside it!)
const LIM_BALL    = 2;    // Keeps particles INSIDE or OUTSIDE the ellipsoid
                          // volume that osculates ('kisses the walls') the
                          // axis-aligned volume xMin,xMax,yMin,yMax,zMin,zMax.
                          // To keep particles INSIDE, set xMin<xMax,yMin<yMax,
                          // zMin<zMax; for OUTSIDE, xMin>xMax,yMin>yMax,zMin>zMax.
const LIM_WALL    = 3;    // Prevents particles from passing through a 2-sided 
                          // axis-aligned wall that is rectangular, flat/2D, 
                          // zero thickness, any desired size & position, set by
                          // xMin,xMax,yMin,yMax,zMin,zMax members. To set wall
                          // orientation, set one min/max pair to equal values
                          // (e.g. zMin=zMax=2; makes a rectangle in z=2 plane
                          //  that spans xMin to xMax and yMin to yMax).
const LIM_DISC    = 4;    // Prevents particls from passing through a 2-sided
                          // axis-aligned ellipsoidal wall that is flat/2D, zero
                          // thickness,any desired size & position, set by
                          // xMin,xMax,yMin,yMax,zMin,zMax members. To set disc
                          // orientation, set one min/max pair to equal values
                          // (e.g. zMin=zMax=2; makes ellipsoidal disk in z=2 
                          // that spans xMin to xMax and yMin to yMax).
const LIM_BOX     = 5;    // Creates an axis-aligned rectangular 'box' made of
                          // zero-thickness 'walls' that prevent particles from 
                          // passing though from either side.  Box defined by
                          // xMin,xMax,yMin,yMax,zMin,zMax members. 
const LIM_MAT_VOL = 6;    // Matrix-transformed LIM_VOL:
                          // Orthonormal Matrix4 member 'poseMatrix' (translate, 
                          // rotate only) transforms 'world' drawing axes to our 
                          // own 'pose' drawing axes,
                          //  where xMin,xMax,yMin,yMax,zMin,zMax members are
                          // applied just as they were in LIM_VOL.   
const LIM_MAT_BALL= 7;    // Matrix-transformed LIM_BALL; 
                          // Orthonormal Matrix4 member 'poseMatrix' (translate, 
                          // rotate only) transforms 'world' drawing axes to our 
                          // own 'pose' drawing axes,
                          //  where xMin,xMax,yMin,yMax,zMin,zMax members are
                          // applied just as they were in LIM_BALL.  
const LIM_MAT_WALL= 8;    // Matrix-transformed LIM_WALL;(recommend zMin=zMax=0)
                          // Orthonormal Matrix4 member 'poseMatrix' (translate, 
                          // rotate only) transforms 'world' drawing axes to our 
                          // own 'pose' drawing axes,
                          //  where xMin,xMax,yMin,yMax,zMin,zMax members are
                          // applied just as they were in LIM_WALL.   
const LIM_MAT_DISC= 9;    // Matrix-transformed LIM_DISC:(recommend zMin=zMax=0)
                          // Orthonormal Matrix4 member 'poseMatrix' (translate, 
                          // rotate only) transforms 'world' drawing axes to our 
                          // own 'pose' drawing axes,
                          //  where xMin,xMax,yMin,yMax,zMin,zMax members are
                          // applied just as they were in LIM_DISC.   
// You could continue this with other shapes too: LIM_CYL_VOL for a cylinder 
// volume; LIM_CYL_SIDE for 2-sided cylindrical tube,LIM_MAT_CYL_VOL and
// LIM_MAT_CYL_SIDE for transformed cylinder volume and tube, etc.

// Distance constraints:
const LIM_ANCHOR  =10;    // Keep specified particle(s) at world-space location
                          // xMin, yMin, zMin.
const LIM_SLOT    =11;    // Limit specified particles(s) positions to stay
                          // within xMin,xMax,yMin,yMax,yMin,zMax (for example,
                          // xMin=0, xMax=1, yMin=yMax=5; zMin=zMax=3; would
                          // allow particle to 'slide' along line segment in x.
const LIM_ROD     =12;    // Connects 2 particles with fixed-length separation
                          // between particles whose indices are held in e1,e2
                          // (e.g. particles at pS0[e1] and pS0[e2] )
const LIM_ROPE    =13;    // Prevent 2 particles selected by members e1,e2 from 
                          // separating by more than distance 'radMax';
const LIM_RADIUS  =14;    // Prevent any particle in a set (targFirst,targCount)
                          // from getting closer than 2*this.radius to any other
                          // particle in that set, as if both particles were
                          // hard solid spheres that can't pass thru each other.
const LIM_PULLEY  =15;    // Keep constant sum-of-distances for 3 particles
                          // A,B,Pivot:  ||A-Pivot||+||B-Pivot|| = dmax.
const LIM_MAXVAR  =16;    // Max number of possible limitType values available.

//=============================================================================
//==============================================================================
function CLimit() {
//==============================================================================
//=============================================================================
// Constructor for a new 'limit' object -- a constraint-applying object.
  this.limitType = LIM_NONE;       // initially no constraint at all.
  this.hitType = HIT_BOUNCE_IMP;   // but set for impulsive collision/bounce
  this.isVisible = true;     // if true, draw this constraint on-screen
  
  this.K_resti = 1.0;       // Coeff. of restoration for constraint surfaces:
                            // Particles moving at speed ||V|| will bounce off
                            // a constraint surface and lose some energy; after
                            // the bounce, speed is ||V||*Kbouncy.
                            //   0.0 <= Kbouncy <= 1.0;     'no bounce'== 0.0;
                            //                          'perfect bounce'==1.0.
  
  // Specify which particles are constrained by this CLimit object:
  this.targFirst =  0;      // particle-number (count from 0 in state variable)
                            // of the first particle constrained by this CLimit;
  this.targCount = -1;      // Number of sequential particles in state variable
                            // constrained by this CLimit object. To select ALL
                            // particles from 'targFirst' on, set targCount < 0.
                            // For pairs of particles chosen by e1,e2 below,
                            // set targCount=0.
  this.e1 = 0; this.e2 = 1; // particle-number (count from 0 in state variable)
                            // of the 2 particles constrained by this CLimit.

  this.xMin = 0.0;   this.xMax = 0.0;     // define axis-aligned volume or box
  this.yMin = 0.0;   this.yMax = 0.0;
  this.zMin = 0.0;   this.zMax = 0.0;
  this.poseMatrix = new Matrix4(); // Orthonormal matrix (translate,rotate ONLY:
                                  // NO SCALING!) that transforms world drawing 
                                  // axes to 'pose' axes where we define 'wall'
                                  // and other non-axis-aligned constraints.
  this.radius = 1.0;        // hard/solid particle size imposed by by LIM_RADIUS
}

CLimit.prototype.printMe = function(opt_src) {
//==============================================================================
// Print relevant contents of a given CLimit object.
  if(opt_src && typeof opt_src === 'string') {
    console.log("------------CLimit ", name, ":----------");
    }
  else {
    console.log("------------CLimit Contents:----------");  
    }
        
  console.log("targFirst:", this.targFirst, "targCount:", this.targCount);
  switch(this.hitType) {
    case HIT_STOP:
      console.log("hitType: HIT_STOP");
      break;
    case HIT_SLIDE:
       console.log("hitType: HIT_SLIDE");
      break;
    case HIT_BOUNCE_VEL:
      console.log("hitType: HIT_BOUNCE_VEL");
      break;
    case HIT_BOUNCE_IMP:
      console.log("hitType: HIT_BOUNCE_IMP");
      break;
    default:
      console.log("***INVALID*** hitType value:", this.hitType);    
      break;
  }
  var tmp =this.limitType;   
  if(tmp < 0) {
    console.log("limitType ***NEGATED***; CLimit object temporarily disabled!");
    tmp = -tmp;   // reverse sign so the switch statement will work.
    }
  switch(this.limitType) {
    case LIM_NONE:
      console.log("limitType: LIM_NONE");
      break;
    case LIM_VOL:
      console.log("limitType: LIM_VOL");
      console.log("(xMin,xMax):", this.xMin,", ", this.xMax,
                  "(yMin,yMax):", this.yMin,", ", this.yMax,
                  "(zMin,zMax):", this.zMin,", ", this.zMax);
      break;
    case LIM_BALL:
      console.log("limitType: LIM_");
      break;
    case LIM_WALL:
      console.log("limitType: LIM_");
      break;
    case LIM_DISC:
      console.log("limitType: LIM_");
      break;
    case LIM_BOX:
      console.log("limitType: LIM_");
      break;
    case LIM_MAT_VOL:
      console.log("limitType: LIM_");
      break;
    case LIM_MAT_BALL:
      console.log("limitType: LIM_");
      break;
    case LIM_MAT_WALL:
      console.log("limitType: LIM_");
      break;
    case LIM_MAT_DISC:
      console.log("limitType: LIM_");
      break;
    case LIM_ANCHOR:
      console.log("limitType: LIM_");
      break;
    case LIM_SLOT:
      console.log("limitType: LIM_");
      break;
    case LIM_ROD:
      console.log("limitType: LIM_");
      break;
    case LIM_ROPE:
      console.log("limitType: LIM_");
      break;
    case LIM_RADIUS:
      console.log("limitType: LIM_");
      break;
    case LIM_PULLEY:
      console.log("limitType: LIM_");
      break;
    default:
      console.log("limitType: invalid value:", this.limitType);
      break;
  }
  console.log("..........................................");

}