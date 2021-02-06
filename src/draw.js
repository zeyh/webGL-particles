"use strict"

function drawParticle(index, g_modelMatrix, g_viewProjMatrix) {
    if (g_particleArray[index].runMode > 1) { // 0=reset; 1= pause; 2=step; 3=run
        if (g_particleArray[index].runMode == 2) {
            g_particleArray[index].runMode = 1;
        }
        g_particleArray[index].applyForces(g_particleArray[index].s1, g_particleArray[index].forceList);  // find current net force on each particle
        g_particleArray[index].dotFinder(g_particleArray[index].s1dot, g_particleArray[index].s1); // find time-derivative s1dot from s1;
        g_particleArray[index].switchToMe();
        g_particleArray[index].render(g_modelMatrix, g_viewProjMatrix);   // transfer current state to VBO, set uniforms, draw it!
        // console.log(JSON.parse(JSON.stringify(g_particleArray[index].s1)));
        g_particleArray[index].solver();         // find s2 from s1 & related states.
        g_particleArray[index].doConstraints();  // Apply all constraints.  s2 is ready!
        g_particleArray[index].swap();           // Make s2 the new current state
    }
    else {
        g_particleArray[index].switchToMe();
        g_particleArray[index].render(g_modelMatrix, g_viewProjMatrix);
    }
}

function drawAll([grid, plane, sphere_test, sphere]) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);    // Clear color and depth buffer

    // particle BOUNCYBALL
    // pushMatrix(g_modelMatrix);
    // g_modelMatrix.setTranslate(1, 0.4, 1);
    // drawParticle(BOUNCYBALL, g_modelMatrix, g_viewProjMatrix);
    // g_modelMatrix = popMatrix();
    // pushMatrix(g_modelMatrix);

    // particle SPRINGMASS
    // pushMatrix(g_modelMatrix);
    // g_modelMatrix.setTranslate(-1, -0.5, 1);
    // drawParticle(SPRINGMASS, g_modelMatrix, g_viewProjMatrix);
    // g_modelMatrix = popMatrix();
    // pushMatrix(g_modelMatrix);

    // particle testing bouncy ball
    pushMatrix(g_modelMatrix);
    g_modelMatrix.setTranslate(-1, 0.4, 1);
    drawParticle(TEST, g_modelMatrix, g_viewProjMatrix);
    g_modelMatrix = popMatrix();
    pushMatrix(g_modelMatrix);


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
        g_modelMatrix.rotate(-90.0, 1, 0, 0);
        g_modelMatrix.translate(0.0, 0.0, -0.6);
        g_modelMatrix.scale(0.4, 0.4, 0.4);
        grid.switchToMe();
        grid.draw(g_modelMatrix, g_viewProjMatrix);
        g_modelMatrix = popMatrix();
    } else {
        // pushMatrix(g_modelMatrix);
        // g_modelMatrix.rotate(-90.0, 1, 0, 0);
        // g_modelMatrix.translate(0.0, 0.0, -0.6);
        // g_modelMatrix.scale(0.4, 0.4, 0.4);
        // plane.switchToMe();
        // plane.draw(g_modelMatrix, g_viewProjMatrix);
        // g_modelMatrix = popMatrix();
    }

}