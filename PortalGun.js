var PortalGun = pc.createScript('portalGun');

// Assign in Editor
PortalGun.attributes.add('cameraEntity', { type: 'entity', title: 'Camera' });
PortalGun.attributes.add('portalA', { type: 'entity', title: 'Portal A' });
PortalGun.attributes.add('portalB', { type: 'entity', title: 'Portal B' });
PortalGun.attributes.add('maxDistance', { type: 'number', default: 50, title: 'Max Distance' });
// Add this if you want crosshair shooting (set to true for crosshair, false for mouse click position)
PortalGun.attributes.add('shootFromCrosshair', { type: 'boolean', default: false, title: 'Shoot From Crosshair' });

PortalGun.prototype.initialize = function () {
    this.app.mouse.on('mousedown', this.onMouseDown, this);
    this.on('destroy', function() {
        this.app.mouse.off('mousedown', this.onMouseDown, this);
    }, this);
};

PortalGun.prototype.onMouseDown = function (event) {
    if (event.button === 0) {
        this.shootPortal(this.portalA, event);
    } else if (event.button === 2) {
        this.shootPortal(this.portalB, event);
    }
};

PortalGun.prototype.shootPortal = function (portalEntity, event) {
    var camera = this.cameraEntity.camera;
    var from = camera.entity.getPosition().clone();
    var to;

    if (this.shootFromCrosshair) {
        // Shoot from screen center (crosshair)
        var canvas = this.app.graphicsDevice.canvas;
        var center = new pc.Vec2(canvas.width / 2, canvas.height / 2);
        to = camera.screenToWorld(center.x, center.y, this.maxDistance);
    } else {
        // Shoot where the mouse clicks
        var mouse = new pc.Vec2(event.x, event.y);
        to = camera.screenToWorld(mouse.x, mouse.y, this.maxDistance);
    }

    var result = this.app.systems.rigidbody.raycastFirst(from, to);
    if (result && result.entity && result.entity.tags.has('portalable')) {
        // Place portal at hit point with slight offset
        var pos = result.point;
        var normal = result.normal;
        var offset = normal.clone().scale(0.01);
        portalEntity.setPosition(pos.add(offset));

        // Orient portal: its local -Z (FORWARD) faces into the wall (along the normal)
        // We'll use lookAt with a calculated up vector for stability
        var up = Math.abs(normal.dot(pc.Vec3.UP)) > 0.99 ? pc.Vec3.RIGHT : pc.Vec3.UP;
        var lookAtTarget = pos.clone().add(normal);
        portalEntity.lookAt(lookAtTarget, up);
        // Flip 180deg to point -Z at the wall (PlayCanvas lookAt points +Z)
        portalEntity.rotateLocal(0, 180, 0);
    }
};
