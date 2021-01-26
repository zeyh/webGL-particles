"use strict"

function drawParticle(g_modelMatrix, g_viewProjMatrix) {
    g_partA.switchToMe();
    if (g_partA.runMode > 1) { // 0=reset; 1= pause; 2=step; 3=run
        if (g_partA.runMode == 2) {
            g_partA.runMode = 1;
        }
        g_partA.applyForces(g_partA.s1, g_partA.forceList);  // find current net force on each particle
        g_partA.dotFinder(g_partA.s1dot, g_partA.s1); // find time-derivative s1dot from s1;
        g_partA.render(g_modelMatrix, g_viewProjMatrix);   // transfer current state to VBO, set uniforms, draw it!
        g_partA.solver();         // find s2 from s1 & related states.
        g_partA.doConstraints();  // Apply all constraints.  s2 is ready!
        g_partA.swap();           // Make s2 the new current state
    }
}

function drawAll([grid, plane, sphere_test, sphere]) {
    // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);    // Clear color and depth buffer

    // particle
    pushMatrix(g_modelMatrix);
    g_modelMatrix.setTranslate(1, 1, 1);
    drawParticle(g_modelMatrix, g_viewProjMatrix);
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
        // TODO: 🐞 buffersubdata buffer overflow, out of range vertices
        // pushMatrix(g_modelMatrix); 
        // g_viewProjMatrix.rotate(-90.0, 1, 0, 0);
        // g_viewProjMatrix.translate(0.0, 0.0, -0.6);
        // g_viewProjMatrix.scale(0.4, 0.4, 0.4);
        // plane.switchToMe();
        // plane.draw(g_modelMatrix, g_viewProjMatrix);
        // g_modelMatrix = popMatrix();
    }

}