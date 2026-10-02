import * as THREE from 'three';

interface P {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  max: number;
  size: number;
}

/** Pooled debris/dust particles in a single instanced mesh. */
export class Particles {
  readonly mesh: THREE.InstancedMesh;
  private ps: P[] = [];
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private s = new THREE.Vector3();
  private col = new THREE.Color();

  constructor(scene: THREE.Scene, private max = 120) {
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial(), max);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    for (let i = 0; i < max; i++) this.mesh.setColorAt(i, this.col.set(0xffffff));
    scene.add(this.mesh);
  }

  burst(x: number, y: number, z: number, n: number, colors: number[], speed = 5): void {
    for (let i = 0; i < n && this.ps.length < this.max; i++) {
      const life = 0.6 + Math.random() * 0.9;
      this.ps.push({
        pos: new THREE.Vector3(x, y, z),
        vel: new THREE.Vector3((Math.random() - 0.5) * speed, Math.random() * speed * 0.8, (Math.random() - 0.5) * speed),
        life, max: life, size: 0.08 + Math.random() * 0.14,
      });
      this.mesh.setColorAt(this.ps.length - 1, this.col.set(colors[i % colors.length]));
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt: number): void {
    let w = 0;
    for (let i = 0; i < this.ps.length; i++) {
      const p = this.ps[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      p.vel.y -= 14 * dt;
      p.pos.addScaledVector(p.vel, dt);
      if (p.pos.y < 0.05) {
        p.pos.y = 0.05;
        p.vel.multiplyScalar(0.5);
        p.vel.y = Math.abs(p.vel.y) * 0.3;
      }
      this.ps[w++] = p;
    }
    this.ps.length = w;
    for (let i = 0; i < w; i++) {
      const p = this.ps[i];
      const k = p.size * Math.min(1, p.life / p.max * 2);
      this.m.compose(p.pos, this.q, this.s.set(k, k, k));
      this.mesh.setMatrixAt(i, this.m);
    }
    this.mesh.count = w;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  clear(): void {
    this.ps.length = 0;
    this.mesh.count = 0;
  }
}
