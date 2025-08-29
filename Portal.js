var Teleporter = pc.createScript('teleporter');

Teleporter.attributes.add('destination', { type: 'entity', title: 'Destination Entity' });
Teleporter.attributes.add('teleportableEntities', {
    type: 'entity',
    array: true,
    title: 'Teleportable Entities'
});
Teleporter.attributes.add('cooldown', { type: 'number', default: 2, title: 'Cooldown Between Uses (sec)' });
Teleporter.attributes.add('preserveVelocity', { type: 'boolean', default: true, title: 'Preserve Velocity' });
Teleporter.attributes.add('exitBoostMultiplier', { type: 'number', default: 1.2, title: 'Exit Boost Multiplier' }); // 1.2 = 20% speed boost

Teleporter.prototype.initialize = function () {
    this.entitiesInside = {};      // { guid: true/false }
    this.lastTeleportTimes = {};   // { guid: time }
    this.entryVelocities = {};     // { guid: pc.Vec3 }
    this.entity.collision.on('triggerenter', this.onTriggerEnter, this);
    this.entity.collision.on('triggerleave', this.onTriggerLeave, this);
    console.log('[Teleporter] Initialized on entity:', this.entity.name);
};

Teleporter.prototype.isTeleportable = function(entity) {
    for (var i = 0; i < this.teleportableEntities.length; i++) {
        if (entity === this.teleportableEntities[i]) return true;
    }
    return false;
};

Teleporter.prototype.onTriggerEnter = function (otherEntity) {
    if (!this.isTeleportable(otherEntity)) {
        console.log('[Teleporter] Entity', otherEntity.name, 'not in teleportableEntities, ignoring.');
        return;
    }

    var guid = otherEntity.getGuid();
    var now = Date.now() / 1000;
    if (this.entitiesInside[guid]) {
        console.log('[Teleporter]', otherEntity.name, 'already inside. Ignoring triggerenter.');
        return;
    }
    if (this.lastTeleportTimes[guid] && now - this.lastTeleportTimes[guid] < this.cooldown) {
        console.log('[Teleporter] Cooldown active for entity (' + otherEntity.name + ', ' + guid + '), or must exit before teleporting again.');
        return;
    }

    this.entitiesInside[guid] = true;
    // Record entry velocity if rigidbody exists
    if (otherEntity.rigidbody) {
        this.entryVelocities[guid] = otherEntity.rigidbody.linearVelocity.clone();
        console.log('[Teleporter] Entry velocity for', otherEntity.name, ':', this.entryVelocities[guid]);
    } else {
        this.entryVelocities[guid] = null;
    }

    if (this.destination) {
        var destPos = this.destination.getPosition();
        console.log('[Teleporter] Destination position for', otherEntity.name, ':', destPos);

        // Store velocity if needed
        var velocity = null;
        if (this.preserveVelocity && otherEntity.rigidbody) {
            velocity = otherEntity.rigidbody.linearVelocity.clone();
            console.log('[Teleporter] Preserving velocity for', otherEntity.name, ':', velocity);
        }

        // Teleport!
        if (otherEntity.rigidbody) {
            otherEntity.rigidbody.teleport(destPos.x, destPos.y, destPos.z);

            if (this.preserveVelocity && velocity) {
                otherEntity.rigidbody.linearVelocity = velocity;
                console.log('[Teleporter] Restored velocity for', otherEntity.name, ':', velocity);
            }
            otherEntity.rigidbody.angularVelocity = new pc.Vec3(0, 0, 0);
        } else {
            otherEntity.setPosition(destPos);
        }
        console.log('[Teleporter] Teleported entity (' + otherEntity.name + ', ' + guid + ') to', destPos);

        this.lastTeleportTimes[guid] = now;

        // Also update the destination portal's state so it doesn't instantly bounce back
        var destScript = this.destination.script.teleporter;
        if (destScript) {
            destScript.lastTeleportTimes[guid] = now;
            destScript.entitiesInside[guid] = true;
            destScript.entryVelocities[guid] = this.entryVelocities[guid] ? this.entryVelocities[guid].clone() : null;
            console.log('[Teleporter] Updated destination teleporter state for', otherEntity.name);
        }
    }
};

Teleporter.prototype.onTriggerLeave = function (otherEntity) {
    if (!this.isTeleportable(otherEntity)) {
        console.log('[Teleporter] Entity', otherEntity.name, 'not in teleportableEntities on leave, ignoring.');
        return;
    }
    var guid = otherEntity.getGuid();
    this.entitiesInside[guid] = false;
    console.log('[Teleporter] Entity (' + otherEntity.name + ', ' + guid + ') exited portal area');

    // Apply boost if there was an entry velocity and rigidbody exists
    if (otherEntity.rigidbody && this.entryVelocities[guid]) {
        var boostVelocity = this.entryVelocities[guid].clone();
        if (boostVelocity.lengthSq() > 0.0001) {
            boostVelocity.scale(this.exitBoostMultiplier);
            otherEntity.rigidbody.linearVelocity = boostVelocity;
            console.log('[Teleporter] Boosted velocity for', otherEntity.name, ':', boostVelocity);
        }
        // Clear the entry velocity after applying boost
        this.entryVelocities[guid] = null;
    }
};
