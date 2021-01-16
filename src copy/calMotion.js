/* calculate harmonic oscilation angles for animations */
'use strict';
const pendulumFcn = (y) => {
    /* 
        @param: t - t span (max time)
                y - [2.5, 0, 1, 0] //initial condition arr with size of 4
        from: https://www.mathworks.com/matlabcentral/fileexchange/46991-simulating-chaotic-behavior-of-double-pendulum
              https://web.mit.edu/jorloff/www/chaosTalk/double-pendulum/double-pendulum-en.html
        offers an ode function describing double pendulum
    */
    //constants
    let l1=1; 
    let l2=2 ; 
    let m1=2000; 
    let m2=1; 
    let g=9.8;
    var yprime = [4]; //y_prime=zeros(4,1);

    //equations
    let a = (m1+m2)*l1 ;
    let b = m2*l2*math.cos(y[0]-y[2]);
    let c = m2*l1*math.cos(y[0]-y[2]) ;
    let d = m2*l2;
    let e = -m2*l2*y[3]*y[3]*math.sin(y[0]-y[2])-g*(m1+m2)*math.sin(y[0]) ;
    let f = m2*l1*y[1]*y[1]*math.sin(y[0]-y[2])-m2*g*math.sin(y[2]) ;

    yprime[0] = y[1]; //angular velocity of top rod
    yprime[2] = y[3] ; //angular velocity of bottom rod
    yprime[1] = (e*d-b*f)/(a*d-c*b) ;
    yprime[3] = (a*f-c*e)/(a*d-c*b) ;

    return yprime
}

function RungeKutta(t_final, h, y0){
    /* 
        @param: t - maximal t span
                h - the time steps 
                y - [2.5, 0, 1, 0] //initial condition arr with size of 4
        ref: https://www.youtube.com/watch?v=0LzDiScAcJI
             https://rosettacode.org/wiki/Runge-Kutta_method#Alternate_solution
             https://www.uio.no/studier/emner/matnat/math/MAT-INF1100/h07/undervisningsmateriale/kap7.pdf
        trying to use RungeKutta solve system of 1st order ODE in the pendulumFcn() 
    */
    // h = 0.1;
    // t_final = 5;
    let N = math.ceil(t_final/h)
    // let t = [N] //not depend on t for our case
    // t[0] = 0
    // t[1] = t[0] + h

    //init solution array
    let sol0 = []
    for(let i=0; i<N; i++){
        let tmp = [0,0,0,0]
        sol0[i] = tmp;
    }
    sol0[0] =  y0;
    for(let n=0; n<N-1; n++){
        let sol1 = pendulumFcn(sol0[n]); // [k1A, k1B, k1C, k1D] 
        let sol2 = []
        for(let i=0; i<4; i++){
            sol2[i] = sol0[n][i] + h/2*sol1[i];
        }
        sol2 = pendulumFcn(sol2)
        let sol3 = []
        for(let i=0; i<4; i++){
            sol3[i] = sol0[n][i] + h/2*sol2[i];
        }
        sol3 = pendulumFcn(sol3)
        let sol4 = []
        for(let i=0; i<4; i++){
            sol4[i] = sol0[n][i] + h*sol3[i];
        }
        sol4 = pendulumFcn(sol4)
        for(let i=0; i<4; i++){
            sol0[n+1][i] = sol0[n][i] + h/6*(sol1[i] + 2*sol2[i] + 2*sol3[i] + sol4[i]);
        }
    }
    return sol0
}

function penMotion(theta1, theta2){
    /*
        if want to convert angle to x,y position:
        % x1=l1*sin(y(:,1)); %first column
        % y1=-l1*cos(y(:,1));
        % x2=l1*sin(y(:,1))+l2*sin(y(:,3)); %third column
        % y2=-l1*cos(y(:,1))-l2*cos(y(:,3));
    */
    theta1=1.6; //init angle
    let theta1_prime=0;
    theta2=2.2;
    let theta2_prime=0;
    let y0=[theta1, theta1_prime, theta2, theta2_prime];
    let tspan=50;
    let dt = 0.1;
    let y = RungeKutta(tspan, dt, y0); //the position of movement
    //first column - angle of first bob, third column - angle of the third bob
    let bob1Motion = [y.length]
    let bob2Motion = [y.length]
    for(let i=0; i<y.length; i++){
        bob1Motion[i] = y[i][1]
        bob2Motion[i] = y[i][2]
    }
    return [bob1Motion, bob2Motion]
}


function SHO(dragAngle){ //underdamped with t is time
    let initAngle = 0; //init angle to start with
    let t_stop = g_endSHOtime; //ending time
    let h = g_SHOgap; //incremental step

    //constant
    let m = 100 //mass
    let g = 10; //gravity constant
    let L = 5; //length of string
    let b = g_damping1; //underdamping factor  < 2mw_0

    //an array from 0 to 100(end)
    let t = [t_stop/h]; 
    t[0] = 0;
    for(let i=1; i<t_stop/h; i++){
        t[i] = t[i-1]+h;
    }
    //an array of 0 from 1 to length of t
    let theta = [t.length]; 
    let angelDerivative = (dragAngle*3.14/180)*3.14; //change degree to rad
    theta[0] = 0;
    theta[1] = theta[0] + angelDerivative*h;

    for(let i=0; i<t.length-2;i++){
        theta[i+2] =  2*theta[i+1] - theta[i] - 
                      h*h*g*Math.sin(theta[i+1])/L 
                      + (b*h/m)*(theta[i]-theta[i+1]); //for t in the middle
    }
    return theta;

}

function SHO2(dragAngle){ //underdamped with t is time
    let initAngle = 0; //init angle to start with
    let t_stop = g_endSHOtime; //ending time
    let h = g_SHOgap; //incremental step

    //constant
    let m = 100 //mass
    let g = 10; //gravity constant
    let L = 2; //length of string
    let b = 5; //underdamping factor  < 2mw_0

    //an array from 0 to 100(end)
    let t = [t_stop/h]; 
    t[0] = 0;
    for(let i=1; i<t_stop/h; i++){
        t[i] = t[i-1]+h;
    }
    //an array of 0 from 1 to length of t
    let theta = [t.length]; 
    let angelDerivative = (dragAngle*3.14/180)*3.14;
    theta[0] = initAngle;
    theta[1] = theta[0] + angelDerivative*h;

    for(let i=0; i<t.length-2;i++){
        theta[i+2] =  2*theta[i+1] - theta[i] - 
                      h*h*g*Math.sin(theta[i+1])/L 
                      + (b*h/m)*(theta[i]-theta[i+1]); //for t in the middle
    }
    return theta;

}
