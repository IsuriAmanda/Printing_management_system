"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const db_1 = __importDefault(require("../config/db"));
async function testConnection() {
    try {
        const connection = await db_1.default.getConnection();
        console.log('MySQL Connected Successfully');
        connection.release();
    }
    catch (error) {
        console.error('Database connection failed:', error);
    }
}
testConnection();
