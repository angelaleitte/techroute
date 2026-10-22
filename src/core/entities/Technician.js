export class Technician {
  constructor({ id, name, specialty = "", active = true }) {
    this.id = id;
    this.name = name;
    this.specialty = specialty;
    this.active = Boolean(active);
    Object.freeze(this);
  }
}
