import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const User = sequelize.define("User", {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true, // temporarily nullable for migration
    unique: true,
    validate: { isEmail: true }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  isAdmin: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  accessibilityPreferences: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const raw = this.getDataValue('accessibilityPreferences');
      if (!raw) return { visual: false, motor: false, cognitive: false, hearing: false };
      try { return JSON.parse(raw); } catch { return { visual: false, motor: false, cognitive: false, hearing: false }; }
    },
    set(val) {
      const safe = {
        visual: !!val?.visual,
        motor: !!val?.motor,
        cognitive: !!val?.cognitive,
        hearing: !!val?.hearing
      };
      this.setDataValue('accessibilityPreferences', JSON.stringify(safe));
    }
  }
});

export default User;
