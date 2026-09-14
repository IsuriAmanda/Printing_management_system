"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = __importDefault(require("./config/db"));
const testConnection = async () => {
    try {
        const connection = await db_1.default.getConnection();
        console.log('Database connected successfully');
        connection.release();
    }
    catch (error) {
        console.error('Database connection failed:', error);
    }
};
testConnection();
