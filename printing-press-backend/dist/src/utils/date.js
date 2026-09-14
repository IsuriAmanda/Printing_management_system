"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.todayInColombo = exports.dateInColombo = void 0;
const COLOMBO_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
});
// Returns the calendar date in Sri Lanka regardless of the server's timezone.
const dateInColombo = (value) => {
    const parts = COLOMBO_DATE_FORMATTER.formatToParts(new Date(value));
    const year = parts.find(part => part.type === 'year')?.value;
    const month = parts.find(part => part.type === 'month')?.value;
    const day = parts.find(part => part.type === 'day')?.value;
    return `${year}-${month}-${day}`;
};
exports.dateInColombo = dateInColombo;
const todayInColombo = () => (0, exports.dateInColombo)(new Date());
exports.todayInColombo = todayInColombo;
