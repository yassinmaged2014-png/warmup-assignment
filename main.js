const fs = require("fs");

// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime){

    function toSeconds(time){
        let [clock, period] = time.split(" ");
        let [h,m,s] = clock.split(":").map(Number);

        if(period === "pm" && h !== 12) h += 12;
        if(period === "am" && h === 12) h = 0;

        return h*3600 + m*60 + s;
    }

    let start = toSeconds(startTime);
    let end = toSeconds(endTime);

    let diff = end - start;

    let h = Math.floor(diff/3600);
    let m = Math.floor((diff%3600)/60);
    let s = diff%60;

    m = String(m).padStart(2,'0');
    s = String(s).padStart(2,'0');

    return `${h}:${m}:${s}`;
}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime,endTime){

    function toSeconds(time){
        let [clock, period] = time.split(" ");
        let [h,m,s] = clock.split(":").map(Number);

        if(period === "pm" && h !== 12) h+=12;
        if(period === "am" && h === 12) h=0;

        return h*3600+m*60+s;
    }

    let start = toSeconds(startTime);
    let end = toSeconds(endTime);

    let workStart = 8*3600;
    let workEnd = 22*3600;

    let idle = 0;

    if(start < workStart) idle += workStart - start;
    if(end > workEnd) idle += end - workEnd;

    let h=Math.floor(idle/3600);
    let m=Math.floor((idle%3600)/60);
    let s=idle%60;

    m=String(m).padStart(2,'0');
    s=String(s).padStart(2,'0');

    return `${h}:${m}:${s}`;
}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration,idleTime){

    function toSeconds(t){
        let [h,m,s]=t.split(":").map(Number);
        return h*3600+m*60+s;
    }

    let shift=toSeconds(shiftDuration);
    let idle=toSeconds(idleTime);

    let active=shift-idle;

    let h=Math.floor(active/3600);
    let m=Math.floor((active%3600)/60);
    let s=active%60;

    m=String(m).padStart(2,'0');
    s=String(s).padStart(2,'0');

    return `${h}:${m}:${s}`;
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date,activeTime){

    let d = new Date(date);
    let eidStart = new Date("2025-04-10");
    let eidEnd = new Date("2025-04-30");

    function toSeconds(t){
        let [h,m,s]=t.split(":").map(Number);
        return h*3600+m*60+s;
    }

    let active = toSeconds(activeTime);

    let quota = 8*3600 + 24*60;

    if(d>=eidStart && d<=eidEnd){
        quota = 6*3600;
    }

    return active >= quota;
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile,shiftObj){

    let data = fs.readFileSync(textFile,"utf8");
    let lines = data.trim().split("\n");

    for(let line of lines){
        let parts=line.split(",");
        if(parts[0]===shiftObj.driverID && parts[2]===shiftObj.date){
            return {};
        }
    }

    let shiftDuration = getShiftDuration(shiftObj.startTime,shiftObj.endTime);
    let idleTime = getIdleTime(shiftObj.startTime,shiftObj.endTime);
    let activeTime = getActiveTime(shiftDuration,idleTime);
    let quota = metQuota(shiftObj.date,activeTime);

    let newLine = `${shiftObj.driverID},${shiftObj.driverName},${shiftObj.date},${shiftObj.startTime},${shiftObj.endTime},${shiftDuration},${idleTime},${activeTime},${quota},false`;

    data += "\n"+newLine;

    fs.writeFileSync(textFile,data);

    return {
        driverID:shiftObj.driverID,
        driverName:shiftObj.driverName,
        date:shiftObj.date,
        startTime:shiftObj.startTime,
        endTime:shiftObj.endTime,
        shiftDuration,
        idleTime,
        activeTime,
        metQuota:quota,
        hasBonus:false
    }
}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile,driverID,date,newValue){

    let data=fs.readFileSync(textFile,"utf8");
    let lines=data.trim().split("\n");

    for(let i=0;i<lines.length;i++){

        let parts=lines[i].split(",");

        if(parts[0]===driverID && parts[2]===date){

            parts[9]=newValue;
            lines[i]=parts.join(",");
        }
    }

    fs.writeFileSync(textFile,lines.join("\n"));
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month){

    let data = fs.readFileSync(textFile,"utf8");
    let lines = data.trim().split("\n");

    let count = 0;
    let found = false;

    month = Number(month);

    for(let line of lines){

        let parts = line.split(",");

        if(parts[0] === driverID){

            found = true;

            let m = new Date(parts[2]).getMonth()+1;

            if(m === month && parts[9].trim() === "true"){
                count++;
            }
        }
    }

    if(!found) return -1;

    return count;
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile,driverID,month){

    let data=fs.readFileSync(textFile,"utf8");
    let lines=data.trim().split("\n");

    let total=0;

    for(let line of lines){

        let parts=line.split(",");

        if(parts[0]===driverID){

            let m=new Date(parts[2]).getMonth()+1;

            if(m==month){

                let [h,mn,s]=parts[7].split(":").map(Number);

                total+=h*3600+mn*60+s;
            }
        }
    }

    let h=Math.floor(total/3600);
    let m=Math.floor((total%3600)/60);
    let s=total%60;

    m=String(m).padStart(2,'0');
    s=String(s).padStart(2,'0');

    return `${h}:${m}:${s}`;
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month){

    let shifts = fs.readFileSync(textFile,"utf8").trim().split("\n");
    let rates = fs.readFileSync(rateFile,"utf8").trim().split("\n");

    let dayOff = null;

    for(let line of rates){
        let parts = line.split(",");
        if(parts[0] === driverID){
            dayOff = parts[1];
        }
    }

    let requiredSeconds = 0;

    for(let line of shifts){

        let parts = line.split(",");

        if(parts[0] === driverID){

            let date = new Date(parts[2]);
            let m = date.getMonth()+1;

            if(m === month){

                let weekday = date.toLocaleDateString("en-US",{weekday:"long"});

                if(weekday !== dayOff){

                    let quota = 8*3600 + 24*60;

                    if(date >= new Date("2025-04-10") && date <= new Date("2025-04-30")){
                        quota = 6*3600;
                    }

                    requiredSeconds += quota;
                }
            }
        }
    }

    // subtract bonus hours (2 hours per bonus)
    requiredSeconds -= bonusCount * 2 * 3600;

    if(requiredSeconds < 0) requiredSeconds = 0;

    let h = Math.floor(requiredSeconds/3600);
    let m = Math.floor((requiredSeconds%3600)/60);
    let s = requiredSeconds%60;

    m = String(m).padStart(2,"0");
    s = String(s).padStart(2,"0");

    return `${h}:${m}:${s}`;
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID,actualHours,requiredHours,rateFile){

    function toHours(t){
        let [h,m,s]=t.split(":").map(Number);
        return h + m/60 + s/3600;
    }

    let rates=fs.readFileSync(rateFile,"utf8").trim().split("\n");

    let base=0;
    let tier=0;

    for(let r of rates){

        let p=r.split(",");

        if(p[0]===driverID){

            base=Number(p[2]);
            tier=Number(p[3]);
        }
    }

    let actual=toHours(actualHours);
    let required=toHours(requiredHours);

    let missing=Math.max(0,required-actual);

    let free=[0,50,20,10,3][tier];

    missing=Math.max(0,missing-free);

    let deductionRate=Math.floor(base/185);

    let deduction=Math.floor(missing)*deductionRate;

    return base-deduction;
}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
