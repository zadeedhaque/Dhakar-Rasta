import * as THREE from 'three';

/**
 * Builds a single merged, vertex-coloured BufferGeometry from simple primitives.
 * Every vehicle / building / stall is one draw call this way, which keeps the
 * low-poly look cheap. Coordinates are plain world/model coordinates.
 */
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
const UNIT_SPHERE = new THREE.SphereGeometry(0.5, 8, 6);
const UNIT_CONE = new THREE.ConeGeometry(0.5, 1, 8);

const _m = new THREE.Matrix4();
const _nm = new THREE.Matrix3();
const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();

export class GeoBuilder {
  private pos: number[] = [];
  private nor: number[] = [];
  private col: number[] = [];
  private idx: number[] = [];

  private add(
    geo: THREE.BufferGeometry,
    x: number, y: number, z: number,
    sx: number, sy: number, sz: number,
    color: number,
    rx = 0, ry = 0, rz = 0,
  ): this {
    _e.set(rx, ry, rz, 'YXZ');
    _q.setFromEuler(_e);
    _m.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
    _nm.getNormalMatrix(_m);
    _c.set(color);
    const base = this.pos.length / 3;
    const pa = geo.attributes.position;
    const na = geo.attributes.normal;
    for (let i = 0; i < pa.count; i++) {
      _v.fromBufferAttribute(pa, i).applyMatrix4(_m);
      this.pos.push(_v.x, _v.y, _v.z);
      _v.fromBufferAttribute(na, i).applyMatrix3(_nm).normalize();
      this.nor.push(_v.x, _v.y, _v.z);
      this.col.push(_c.r, _c.g, _c.b);
    }
    const ia = geo.index!.array;
    for (let i = 0; i < ia.length; i++) this.idx.push(ia[i] + base);
    return this;
  }

  /** Box centred at (x,y,z) with size (w,h,d). */
  box(x: number, y: number, z: number, w: number, h: number, d: number, color: number, rx = 0, ry = 0, rz = 0) {
    return this.add(UNIT_BOX, x, y, z, w, h, d, color, rx, ry, rz);
  }
  /** Vertical cylinder centred at (x,y,z). */
  cyl(x: number, y: number, z: number, radius: number, height: number, color: number, rx = 0, ry = 0, rz = 0) {
    return this.add(UNIT_CYL, x, y, z, radius * 2, height, radius * 2, color, rx, ry, rz);
  }
  /** Wheel: cylinder whose axis runs along X. */
  wheel(x: number, y: number, z: number, radius: number, width: number, color = 0x161616) {
    return this.add(UNIT_CYL, x, y, z, radius * 2, width, radius * 2, color, 0, 0, Math.PI / 2);
  }
  /** Ellipsoid with diameters (dx,dy,dz). */
  sphere(x: number, y: number, z: number, dx: number, dy: number, dz: number, color: number) {
    return this.add(UNIT_SPHERE, x, y, z, dx, dy, dz, color);
  }
  /** Cone with base diameter dx/dz and height h, centred on its mid-height. */
  cone(x: number, y: number, z: number, dx: number, h: number, dz: number, color: number) {
    return this.add(UNIT_CONE, x, y, z, dx, h, dz, color);
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

/** One shared material for all vertex-coloured low-poly geometry. */
export const VERTEX_MATERIAL = new THREE.MeshLambertMaterial({ vertexColors: true });
