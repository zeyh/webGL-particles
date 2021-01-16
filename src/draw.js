"use strict"

function drawAll([grid, plane, sphere_test]){
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);    // Clear color and depth buffer

    //draw draggable light source on sphere
    if(hideSphere){
        pushMatrix(g_modelMatrix);
        g_modelMatrix.setScale(2,2,2);
        // g_modelMatrix.translate(0,3,0);
        g_modelMatrix.rotate(currentAngle, 0,1,0);
        sphere_test.switchToMe();
        sphere_test.draw(g_modelMatrix, g_viewProjMatrix);
        g_modelMatrix = popMatrix();
    }

    //draw grid
    if(!hideGrid){
        pushMatrix(g_modelMatrix);
        g_viewProjMatrix.rotate(-90.0, 1, 0, 0);
        g_viewProjMatrix.translate(0.0, 0.0, -0.6);
        g_viewProjMatrix.scale(0.4, 0.4, 0.4);
        grid.switchToMe();
        grid.draw(g_modelMatrix, g_viewProjMatrix);
        g_modelMatrix = popMatrix();
    }else{
        pushMatrix(g_modelMatrix);
        g_viewProjMatrix.rotate(-90.0, 1, 0, 0);
        g_viewProjMatrix.translate(0.0, 0.0, -0.6);
        g_viewProjMatrix.scale(0.4, 0.4, 0.4);
        plane.switchToMe();
        plane.draw(g_modelMatrix, g_viewProjMatrix);
        g_modelMatrix = popMatrix();
    }
}