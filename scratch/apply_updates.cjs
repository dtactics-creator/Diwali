const fs = require('fs');

// --- 1. Update PlayerCharacter3D.tsx ---
let pCode = fs.readFileSync('src/components/3d/PlayerCharacter3D.tsx', 'utf8');

const pFind = `    const input = inputRef.current;
    const isRetreating = autoMoveMode === 'retreat';
    let moveX = 0;
    let moveZ = 0;

    // Normal manual movement allowed only when not in mandatory retreat or ignition
    if (!isRetreating && forcedState !== 'Ignite') {
      moveX = input.joyX;
      moveZ = input.joyY;

      if (input.left) moveX -= 1;
      if (input.right) moveX += 1;
      if (input.forward) moveZ -= 1;
      if (input.backward) moveZ -= 1;
    }
    const walkSpeed = 2.05;
    const runSpeed = 3.55;
    if (!autoMoveTarget) completedAutoTargetRef.current = null;
    const autoKey = autoMoveTarget ? \`\${autoMoveMode}:\${autoMoveTarget[0].toFixed(2)}:\${autoMoveTarget[2].toFixed(2)}\` : null;
    if (autoKey !== completedAutoTargetRef.current && autoMoveTarget) {
      const dx = autoMoveTarget[0] - posRef.current.x;
      const dz = autoMoveTarget[2] - posRef.current.z;
      const distance = Math.hypot(dx, dz);
      if (distance <= 0.16) {
        velocityRef.current.set(0, 0, 0);
        completedAutoTargetRef.current = autoKey;
        onAutoMoveComplete?.();
      } else {
        moveX = dx / distance;
        moveZ = dz / distance;
      }
    }
    const inputLength = Math.hypot(moveX, moveZ);
    const autoMoving = Boolean(autoMoveTarget && autoKey !== completedAutoTargetRef.current);
    const hasMoveInput = (inputLength > 0.08 || autoMoving) && forcedState !== 'Ignite';
    const maxSpeed = autoMoving ? (autoMoveMode === 'retreat' ? runSpeed : walkSpeed) : (input.run ? runSpeed : walkSpeed);`;

const pReplace = `    const input = inputRef.current;
    const isRetreating = autoMoveMode === 'retreat';
    let moveX = 0;
    let moveZ = 0;

    const walkSpeed = 2.05;
    const runSpeed = 3.55;
    if (!autoMoveTarget) completedAutoTargetRef.current = null;
    const autoKey = autoMoveTarget ? \`\${autoMoveMode}:\${autoMoveTarget[0].toFixed(2)}:\${autoMoveTarget[2].toFixed(2)}\` : null;
    const isAutoNavigating = Boolean(autoMoveTarget && autoMoveMode && autoKey !== completedAutoTargetRef.current && forcedState !== 'Ignite');

    if (isAutoNavigating && autoMoveTarget) {
      const dx = autoMoveTarget[0] - posRef.current.x;
      const dz = autoMoveTarget[2] - posRef.current.z;
      const distance = Math.hypot(dx, dz);
      const arrivalThreshold = autoMoveMode === 'approach' ? 0.08 : 0.16;
      if (distance <= arrivalThreshold) {
        velocityRef.current.set(0, 0, 0);
        desiredVelocityRef.current.set(0, 0, 0);
        completedAutoTargetRef.current = autoKey;
        onPositionChange([posRef.current.x, posRef.current.y, posRef.current.z], currentStateRef.current);
        onAutoMoveComplete?.();
      } else {
        moveX = dx / distance;
        moveZ = dz / distance;
      }
    } else if (!isRetreating && forcedState !== 'Ignite') {
      // Normal manual keyboard/touch movement: S & Down Arrow move backward (+Z towards camera)
      moveX = input.joyX;
      moveZ = input.joyY;

      if (input.left) moveX -= 1;
      if (input.right) moveX += 1;
      if (input.forward) moveZ -= 1;
      if (input.backward) moveZ += 1; // Verified: +Z is backward (towards camera)

      // Normalize diagonal keyboard input so moving diagonally is not faster
      const manualLen = Math.hypot(moveX, moveZ);
      if (manualLen > 1) {
        moveX /= manualLen;
        moveZ /= manualLen;
      }
    }

    const inputLength = Math.hypot(moveX, moveZ);
    const hasMoveInput = inputLength > 0.08 && forcedState !== 'Ignite';
    const maxSpeed = isAutoNavigating ? (autoMoveMode === 'retreat' ? runSpeed : walkSpeed) : (input.run ? runSpeed : walkSpeed);`;

// Normalize CRLF to LF for matching, then restore CRLF
const pCodeNorm = pCode.replace(/\r\n/g, '\n');
const pFindNorm = pFind.replace(/\r\n/g, '\n');
const pReplaceNorm = pReplace.replace(/\r\n/g, '\n');

if (!pCodeNorm.includes(pFindNorm)) {
  console.error('Target block in PlayerCharacter3D not found!');
  process.exit(1);
}

let pCodeUpdated = pCodeNorm.replace(pFindNorm, pReplaceNorm);

const runTarget = "const useRun = (autoMoving && autoMoveMode === 'retreat') || (input.run && hasMoveInput);";
const runReplace = "const useRun = (isAutoNavigating && autoMoveMode === 'retreat') || (!isAutoNavigating && input.run && hasMoveInput);";
if (!pCodeUpdated.includes(runTarget)) {
  console.error('runTarget in PlayerCharacter3D not found!');
  process.exit(1);
}
pCodeUpdated = pCodeUpdated.replace(runTarget, runReplace);

fs.writeFileSync('src/components/3d/PlayerCharacter3D.tsx', pCodeUpdated.replace(/\n/g, '\r\n'), 'utf8');
console.log('PlayerCharacter3D.tsx successfully updated!');

// --- 2. Update GameScreen.tsx ---
let gCode = fs.readFileSync('src/components/pages/GameScreen.tsx', 'utf8').replace(/\r\n/g, '\n');

const gFindApproach = `  // Initiate Sequential Cracker Interaction Flow (Approach -> Reach Fuse -> Ignite -> Retreat -> Safe -> Celebrate)
  const handleIgniteCracker = useCallback(
    (instanceId: string) => {
      // 1. Never allow ignition when another cracker interaction is already in progress
      if (interactionStateRef.current !== 'idle' || isPaused) return;

      const target = placedCrackers.find((c) => c.instanceId === instanceId);
      if (!target || target.state !== 'Placed') return;

      // 2. Strict Proximity Check: verify physical distance to cracker fuse / base
      const fusePos = getCrackerWorldFusePosition(target);
      const distToFuse = Math.hypot(
        characterPosRef.current[0] - fusePos[0],
        characterPosRef.current[2] - fusePos[2]
      );
      const distToBase = Math.hypot(
        characterPosRef.current[0] - target.position[0],
        characterPosRef.current[2] - target.position[2]
      );
      const effectiveDist = Math.min(distToFuse, distToBase);
      const maxRange = CRACKERS[target.crackerId].interactionDistance;

      if (effectiveDist > maxRange) {
        // Outside interaction range: do absolutely nothing (no remote ignition!)
        return;
      }

      // 3. Initiate Approach Phase
      setActiveInstanceId(instanceId);
      setInteractionState('approaching');

      // Calculate natural standing position near the actual fuse
      const dx = characterPosRef.current[0] - fusePos[0];
      const dz = characterPosRef.current[2] - fusePos[2];
      const len = Math.hypot(dx, dz);
      const dirX = len > 0.01 ? dx / len : 0;
      const dirZ = len > 0.01 ? dz / len : 1;
      const standX = THREE.MathUtils.clamp(
        fusePos[0] + dirX * 0.48,
        environment.movementBounds.minX + 0.25,
        environment.movementBounds.maxX - 0.25
      );
      const standZ = THREE.MathUtils.clamp(
        fusePos[2] + dirZ * 0.48,
        environment.movementBounds.minZ + 0.25,
        environment.movementBounds.maxZ - 0.25
      );

      setIgniteTargetPos(fusePos);
      setAutoMoveTarget([standX, environment.groundY, standZ]);
      setAutoMoveMode('approach');
      setForcedCharState(null); // Natural walking animation during approach
    },
    [isPaused, placedCrackers, environment.movementBounds, environment.groundY]
  );

  // Handle Character Auto-Movement Waypoint Completion
  const handleAutoMoveComplete = useCallback(() => {
    const currentState = interactionStateRef.current;
    const currentActiveId = activeInstanceIdRef.current;

    if (currentState === 'approaching') {
      // Step: Approach completed -> Character reaches near fuse
      setAutoMoveTarget(null);
      setAutoMoveMode(null);

      const target = placedCrackers.find((c) => c.instanceId === currentActiveId);
      if (!target) {
        setInteractionState('idle');
        setActiveInstanceId(null);
        return;
      }

      const fusePos = getCrackerWorldFusePosition(target);
      setIgniteTargetPos(fusePos);
      setInteractionState('reaching_fuse');
      setForcedCharState('Ignite'); // Crouch down and reach glowing agarbatti to actual fuse

      if (reachTimerRef.current) clearTimeout(reachTimerRef.current);
      reachTimerRef.current = setTimeout(() => {
        setInteractionState('igniting');

        // Cracker state transitions to 'Igniting'
        const ignTs = performance.now();
        setPlacedCrackers((prev) =>
          prev.map((item) =>
            item.instanceId === currentActiveId
              ? { ...item, state: 'Igniting', ignitedAt: ignTs }
              : item
          )
        );

        const cfg = CRACKERS[target.crackerId];
        audioSystem.playFuseIgnite(cfg.ignitionDuration);

        // Maintain reaching-lighting posture for 700ms so fuse visibly catches fire with sparks
        if (lightTimerRef.current) clearTimeout(lightTimerRef.current);
        lightTimerRef.current = setTimeout(() => {
          // Immediately switch into MANDATORY RETREAT
          setInteractionState('retreating');
          setForcedCharState(null);

          const safeRadius = Math.max(cfg.safetyRadius + 1.2, 2.6);
          const retreatPos = findSafeRetreatPoint(
            target.position,
            characterPosRef.current,
            safeRadius,
            environment.movementBounds,
            environment.groundY
          );

          setAutoMoveTarget(retreatPos);
          setAutoMoveMode('retreat');
          // Face the cracker upon completing retreat
          setIgniteTargetPos(target.position);
        }, 700);
      }, 350);
    } else if (currentState === 'retreating') {
      // Step: Retreat completed -> Verify safe distance
      const target = placedCrackers.find((c) => c.instanceId === currentActiveId);
      const safeRadius = target
        ? Math.max(CRACKERS[target.crackerId].safetyRadius + 1.2, 2.6)
        : 2.6;
      const currentDist = target
        ? Math.hypot(
            characterPosRef.current[0] - target.position[0],
            characterPosRef.current[2] - target.position[2]
          )
        : Infinity;

      if (currentDist >= safeRadius) {
        setAutoMoveTarget(null);
        setAutoMoveMode(null);
        setInteractionState('safe');
        // Restore controls & automatically trigger Diwali celebration
        setForcedCharState('Celebrate');
        setInteractionState('celebrating');
      }
    }
  }, [placedCrackers, environment.movementBounds, environment.groundY]);`;

const gReplaceApproach = `  // Start physical reaching, fuse lighting, and automatic retreat sequence
  const startLightingSequence = useCallback(
    (target: PlacedCrackerInstance) => {
      const fusePos = getCrackerWorldFusePosition(target);
      setAutoMoveTarget(null);
      setAutoMoveMode(null);
      setIgniteTargetPos(fusePos);
      setInteractionState('reaching_fuse');
      setForcedCharState('Ignite'); // Crouch down and reach glowing agarbatti directly to actual fuse

      if (reachTimerRef.current) clearTimeout(reachTimerRef.current);
      reachTimerRef.current = setTimeout(() => {
        setInteractionState('igniting');

        // Cracker state transitions to 'Igniting' (fuse catches fire)
        const ignTs = performance.now();
        setPlacedCrackers((prev) =>
          prev.map((item) =>
            item.instanceId === target.instanceId
              ? { ...item, state: 'Igniting', ignitedAt: ignTs }
              : item
          )
        );

        const cfg = CRACKERS[target.crackerId];
        audioSystem.playFuseIgnite(cfg.ignitionDuration);

        // Maintain reaching-lighting posture for 700ms so fuse visibly catches fire with sparks
        if (lightTimerRef.current) clearTimeout(lightTimerRef.current);
        lightTimerRef.current = setTimeout(() => {
          // Immediately switch into MANDATORY RETREAT
          setInteractionState('retreating');
          setForcedCharState(null);

          const safeRadius = Math.max(cfg.safetyRadius + 1.2, 2.6);
          const retreatPos = findSafeRetreatPoint(
            target.position,
            characterPosRef.current,
            safeRadius,
            environment.movementBounds,
            environment.groundY
          );

          setAutoMoveTarget(retreatPos);
          setAutoMoveMode('retreat');
          // Face the cracker upon completing retreat
          setIgniteTargetPos(target.position);
        }, 700);
      }, 350);
    },
    [environment.movementBounds, environment.groundY]
  );

  // Initiate Sequential Cracker Interaction Flow (Approach -> Reach Fuse -> Ignite -> Retreat -> Safe -> Celebrate)
  const handleIgniteCracker = useCallback(
    (instanceId: string) => {
      // 1. Never allow ignition when another cracker interaction is already in progress
      if (interactionStateRef.current !== 'idle' || isPaused) return;

      const target = placedCrackers.find((c) => c.instanceId === instanceId);
      if (!target || target.state !== 'Placed') return;

      // 2. Strict Proximity Check: verify physical distance to cracker fuse / base
      const fusePos = getCrackerWorldFusePosition(target);
      const distToFuse = Math.hypot(
        characterPosRef.current[0] - fusePos[0],
        characterPosRef.current[2] - fusePos[2]
      );
      const distToBase = Math.hypot(
        characterPosRef.current[0] - target.position[0],
        characterPosRef.current[2] - target.position[2]
      );
      const effectiveDist = Math.min(distToFuse, distToBase);
      const maxRange = CRACKERS[target.crackerId].interactionDistance;

      if (effectiveDist > maxRange) {
        // Outside interaction range: do absolutely nothing (no remote ignition!)
        return;
      }

      // 3. Initiate Physical Approach Phase towards actual fuse
      setActiveInstanceId(instanceId);

      // Calculate natural standing position near the actual fuse (38cm stand offset)
      const dx = characterPosRef.current[0] - fusePos[0];
      const dz = characterPosRef.current[2] - fusePos[2];
      const len = Math.hypot(dx, dz);
      const dirX = len > 0.01 ? dx / len : 0;
      const dirZ = len > 0.01 ? dz / len : 1;
      const standOffset = 0.38;
      const standX = THREE.MathUtils.clamp(
        fusePos[0] + dirX * standOffset,
        environment.movementBounds.minX + 0.25,
        environment.movementBounds.maxX - 0.25
      );
      const standZ = THREE.MathUtils.clamp(
        fusePos[2] + dirZ * standOffset,
        environment.movementBounds.minZ + 0.25,
        environment.movementBounds.maxZ - 0.25
      );

      const distToStand = Math.hypot(
        characterPosRef.current[0] - standX,
        characterPosRef.current[2] - standZ
      );

      setIgniteTargetPos(fusePos);

      if (distToStand <= 0.08) {
        // Character is already right at the fuse stand location: start lighting directly
        startLightingSequence(target);
      } else {
        // Physically walk to the fuse stand location
        setInteractionState('approaching');
        setAutoMoveTarget([standX, environment.groundY, standZ]);
        setAutoMoveMode('approach');
        setForcedCharState(null); // Natural walking animation during physical approach
      }
    },
    [isPaused, placedCrackers, environment.movementBounds, environment.groundY, startLightingSequence]
  );

  // Handle Character Auto-Movement Waypoint Completion
  const handleAutoMoveComplete = useCallback(() => {
    const currentState = interactionStateRef.current;
    const currentActiveId = activeInstanceIdRef.current;

    if (currentState === 'approaching') {
      // Step: Approach completed -> Character reaches near fuse
      const target = placedCrackers.find((c) => c.instanceId === currentActiveId);
      if (!target) {
        setInteractionState('idle');
        setActiveInstanceId(null);
        setAutoMoveTarget(null);
        setAutoMoveMode(null);
        return;
      }
      startLightingSequence(target);
    } else if (currentState === 'retreating') {
      // Step: Retreat completed -> Verify safe distance
      const target = placedCrackers.find((c) => c.instanceId === currentActiveId);
      const safeRadius = target
        ? Math.max(CRACKERS[target.crackerId].safetyRadius + 1.2, 2.6)
        : 2.6;
      const currentDist = target
        ? Math.hypot(
            characterPosRef.current[0] - target.position[0],
            characterPosRef.current[2] - target.position[2]
          )
        : Infinity;

      if (currentDist >= safeRadius) {
        setAutoMoveTarget(null);
        setAutoMoveMode(null);
        setInteractionState('safe');
        // Restore controls & automatically trigger Diwali celebration
        setForcedCharState('Celebrate');
        setInteractionState('celebrating');
        if (target) setIgniteTargetPos(target.position);
      }
    }
  }, [placedCrackers, startLightingSequence]);`;

if (!gCode.includes(gFindApproach)) {
  console.error('gFindApproach in GameScreen.tsx not found!');
  process.exit(1);
}
gCode = gCode.replace(gFindApproach, gReplaceApproach);

// Update keyboard handling in GameScreen to support e.code and blur
const kFind = `      // Movement — allow browser key-repeat for held movement keys
      if (key === 'w' || e.key === 'ArrowUp') inputRef.current.forward = true;
      if (key === 's' || e.key === 'ArrowDown') inputRef.current.backward = true;
      if (key === 'a' || e.key === 'ArrowLeft') inputRef.current.left = true;
      if (key === 'd' || e.key === 'ArrowRight') inputRef.current.right = true;

      // Shift = Run
      if (e.key === 'Shift' && !e.repeat) inputRef.current.run = true;

      // Crouch — hold
      if (key === 'c' && !e.repeat) inputRef.current.crouch = true;

      // Number keys 1-6 select crackers
      if (!e.repeat && ['1', '2', '3', '4', '5', '6'].includes(key)) {
        const idx = parseInt(key, 10) - 1;
        if (CRACKER_LIST[idx]) {
          audioSystem.playUIClick();
          onSelectCrackerId(CRACKER_LIST[idx].id);
        }
      }

      // Strict Proximity E key: ONLY lights nearest interactable cracker when within range and idle
      if (key === 'e' && !e.repeat) {
        if (nearestInteractableCracker && interactionStateRef.current === 'idle') {
          handleIgniteCracker(nearestInteractableCracker.instanceId);
        }
        // If outside interaction range: do absolutely nothing. No remote ignition fallback.
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || e.key === 'ArrowUp') inputRef.current.forward = false;
      if (key === 's' || e.key === 'ArrowDown') inputRef.current.backward = false;
      if (key === 'a' || e.key === 'ArrowLeft') inputRef.current.left = false;
      if (key === 'd' || e.key === 'ArrowRight') inputRef.current.right = false;
      if (e.key === 'Shift') inputRef.current.run = false;
      if (key === 'c') inputRef.current.crouch = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };`;

const kReplace = `      // Movement — allow browser key-repeat for held movement keys (supports W/A/S/D and Arrow keys)
      if (key === 'w' || e.key === 'ArrowUp' || e.code === 'KeyW' || e.code === 'ArrowUp') inputRef.current.forward = true;
      if (key === 's' || e.key === 'ArrowDown' || e.code === 'KeyS' || e.code === 'ArrowDown') inputRef.current.backward = true;
      if (key === 'a' || e.key === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'ArrowLeft') inputRef.current.left = true;
      if (key === 'd' || e.key === 'ArrowRight' || e.code === 'KeyD' || e.code === 'ArrowRight') inputRef.current.right = true;

      // Shift = Run
      if ((e.key === 'Shift' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') && !e.repeat) inputRef.current.run = true;

      // Crouch — hold
      if ((key === 'c' || e.code === 'KeyC') && !e.repeat) inputRef.current.crouch = true;

      // Number keys 1-6 select crackers
      if (!e.repeat && ['1', '2', '3', '4', '5', '6'].includes(key)) {
        const idx = parseInt(key, 10) - 1;
        if (CRACKER_LIST[idx]) {
          audioSystem.playUIClick();
          onSelectCrackerId(CRACKER_LIST[idx].id);
        }
      }

      // Strict Proximity E key: ONLY lights nearest interactable cracker when within range and idle
      if ((key === 'e' || e.code === 'KeyE') && !e.repeat) {
        if (nearestInteractableCracker && interactionStateRef.current === 'idle') {
          handleIgniteCracker(nearestInteractableCracker.instanceId);
        }
        // If outside interaction range: do absolutely nothing. No remote ignition fallback.
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || e.key === 'ArrowUp' || e.code === 'KeyW' || e.code === 'ArrowUp') inputRef.current.forward = false;
      if (key === 's' || e.key === 'ArrowDown' || e.code === 'KeyS' || e.code === 'ArrowDown') inputRef.current.backward = false;
      if (key === 'a' || e.key === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'ArrowLeft') inputRef.current.left = false;
      if (key === 'd' || e.key === 'ArrowRight' || e.code === 'KeyD' || e.code === 'ArrowRight') inputRef.current.right = false;
      if (e.key === 'Shift' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') inputRef.current.run = false;
      if (key === 'c' || e.code === 'KeyC') inputRef.current.crouch = false;
    };

    const handleBlur = () => {
      inputRef.current.forward = false;
      inputRef.current.backward = false;
      inputRef.current.left = false;
      inputRef.current.right = false;
      inputRef.current.run = false;
      inputRef.current.crouch = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };`;

if (!gCode.includes(kFind)) {
  console.error('kFind in GameScreen.tsx not found!');
  process.exit(1);
}
gCode = gCode.replace(kFind, kReplace);

fs.writeFileSync('src/components/pages/GameScreen.tsx', gCode.replace(/\n/g, '\r\n'), 'utf8');
console.log('GameScreen.tsx successfully updated!');
