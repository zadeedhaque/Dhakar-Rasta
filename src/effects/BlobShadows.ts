import * as THREE from 'three';

/**
 * Cheap soft contact shadows for every moving thing, drawn in ONE instanced
 * draw call (real shadow maps for a whole street would be far too costly).
 */
export class BlobShadows {
  readonly mesh: THREE.InstancedMesh;
  private n = 0;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  private p = new THREE.Vector3();
  private sc = new THREE.Vector3();

  constructor(scene: THREE.Scene, max = 260) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const grd = g.createRadialGradient(32, 32, 4, 32, 32, 32);
    grd.addColorStop(0, 'rgba(0,0,0,0.55)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: true });
    this.mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat, max);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    scene.add(this.mesh);
  }

  begin(): void {
    this.n = 0;
  }

  add(x: number, s: number, halfW: number, halfL: number, y = 0.03): void {
    if (this.n >= this.mesh.count) return;
    this.p.set(x, y, -s);
    this.sc.set(halfW * 2.6, halfL * 2.3, 1);
    this.m.compose(this.p, this.q, this.sc);
    this.mesh.setMatrixAt(this.n++, this.m);
  }

  end(): void {
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
