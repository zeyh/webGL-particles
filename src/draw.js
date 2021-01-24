"use strict"

function drawParticle(timeStep, particle, g_modelMatrix, g_viewProjMatrix) {
    if (myRunMode > 1) { // 0=reset; 1= pause; 2=step; 3=run
        if (myRunMode == 2) {
            myRunMode = 1;		// (if 2, do just one step and pause.)
        }

        yvelNow -= g_grav * (timeStep * 0.001);
        xvelNow *= g_drag;
        yvelNow *= g_drag;

        xposNow += xvelNow * (timeStep * 0.001);
        yposNow += yvelNow * (timeStep * 0.001);

        // -- 'bounce' our ball off the walls at (0,0), (1.8, 1.8):
        if (xposNow < 0.0 && xvelNow < 0.0) { // bounce on left wall.
            xvelNow = -xvelNow;
        }
        else if (xposNow > 1.8 && xvelNow > 0.0) { // bounce on right wall
            xvelNow = -xvelNow;
        }
        if (yposNow < 0.0 && yvelNow < 0.0) {		// bounce on floor
            yvelNow = -yvelNow;
        }
        else if (yposNow > 1.8 && yvelNow > 0.0) {		// bounce on ceiling
            yvelNow = -yvelNow;
        }
        if (yposNow < 0.0) yposNow = 0.0;
    }
    particle.draw(g_modelMatrix, g_viewProjMatrix);

}

function drawAll(timeStep, [grid, plane, sphere_test, sphere, particle]) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);    // Clear color and depth buffer

    // particle
    pushMatrix(g_modelMatrix);
    g_modelMatrix.setTranslate(1, 1, 1);
    particle.switchToMe();
    drawParticle(timeStep, particle, g_modelMatrix, g_viewProjMatrix);
    g_modelMatrix = popMatrix();

    //draw draggable light source on sphere
    if (hideSphere) {
        pushMatrix(g_modelMatrix);
        g_modelMatrix.setScale(2, 2, 2);
        g_modelMatrix.translate(0, 1.5, 0);
        g_modelMatrix.rotate(currentAngle, 0, 1, 0);
        sphere_test.switchToMe();
        sphere_test.draw(g_modelMatrix, g_viewProjMatrix);
        g_modelMatrix = popMatrix();
    }

    //draw grid
    if (!hideGrid) {
        pushMatrix(g_modelMatrix);
        g_viewProjMatrix.rotate(-90.0, 1, 0, 0);
        g_viewProjMatrix.translate(0.0, 0.0, -0.6);
        g_viewProjMatrix.scale(0.4, 0.4, 0.4);
        grid.switchToMe();
        grid.draw(g_modelMatrix, g_viewProjMatrix);
        g_modelMatrix = popMatrix();
    } else {
        pushMatrix(g_modelMatrix);
        g_viewProjMatrix.rotate(-90.0, 1, 0, 0);
        g_viewProjMatrix.translate(0.0, 0.0, -0.6);
        g_viewProjMatrix.scale(0.4, 0.4, 0.4);
        plane.switchToMe();
        plane.draw(g_modelMatrix, g_viewProjMatrix);
        g_modelMatrix = popMatrix();
    }
}