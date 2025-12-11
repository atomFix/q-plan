
import { RelationResponse } from '../types';

export const REAL_RELATION_DATA = {
    "status": 0,
    "message": null,
    "data": {
        "name": "技术中心",
        "employees": [
            { "rtx_id": "yu.zhang", "name": "张宇" },
            { "rtx_id": "yongsheng.yang", "name": "杨永胜" }
        ],
        "groups": [
            {
                "name": "QAL",
                "employees": [
                    { "rtx_id": "zhimeng.wang", "name": "王植萌" },
                    { "rtx_id": "yonghang.fu", "name": "傅永航" },
                    { "rtx_id": "xinhuang.liu", "name": "刘新煌" }
                ],
                "groups": []
            },
            {
                "name": "国内机票研发",
                "employees": [ { "rtx_id": "xiaohang.yu", "name": "于孝航" } ],
                "groups": [
                    {
                        "name": "GDS基础服务",
                        "employees": [
                            { "rtx_id": "xiaobo.zhang", "name": "张晓博" },
                            { "rtx_id": "yinfeng.guo", "name": "郭银枫" }
                        ],
                        "groups": []
                    },
                    {
                        "name": "主站报价与自营",
                        "employees": [ { "rtx_id": "kai.yin", "name": "尹凯" } ],
                        "groups": [
                            {
                                "name": "国内主站",
                                "employees": [
                                    { "rtx_id": "weicheng.jiang", "name": "蒋炜成" },
                                    { "rtx_id": "gaoju.xue", "name": "薛高举" }
                                ],
                                "groups": []
                            }
                        ]
                    }
                ]
            },
            {
                "name": "国际机票研发",
                "employees": [ { "rtx_id": "longmei.shen", "name": "沈龙梅" } ],
                "groups": [
                    {
                        "name": "主站与报价",
                        "employees": [ { "rtx_id": "junyu.lin", "name": "林君宇" } ],
                        "groups": [
                            {
                                "name": "国际主站",
                                "employees": [
                                    { "rtx_id": "taost.sun", "name": "孙涛st" },
                                    { "rtx_id": "yuxuan.cui", "name": "崔宇轩" },
                                    { "rtx_id": "houjun.sun", "name": "孙厚军" },
                                    { "rtx_id": "likai.jiang", "name": "姜立凯" },
                                    { "rtx_id": "jike.liang", "name": "梁继科" },
                                    { "rtx_id": "kairong.liu", "name": "刘铠熔" },
                                    { "rtx_id": "geyangz.zhang", "name": "张歌杨z" }
                                ],
                                "groups": []
                            }
                        ]
                    }
                ]
            }
        ]
    }
};

// Generate some random tasks for filling gaps
const getRandomTasks = (date: string) => {
    const tasks = [];
    if (Math.random() > 0.8) {
        tasks.push({ "priority": "P3", "name": `FD-AUTO-${Math.floor(Math.random()*100)}`, "title": "日常维护与支持", "issuetype": "任务", "workhour": "1.0", "job": "coding" });
    }
    return tasks;
};

// Helper to fill plans for the full range
const fillPlans = (basePlans: any[]) => {
    const start = new Date("2025-11-26");
    const end = new Date("2025-12-30");
    const fullPlans = [...basePlans];
    const existingDates = new Set(basePlans.map(p => p.date));

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        if (!existingDates.has(dateStr)) {
            // Add filler data for weekends or just random days to make the grid look alive
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            if (!isWeekend) {
                const tasks = getRandomTasks(dateStr);
                if (tasks.length > 0) {
                    fullPlans.push({
                        date: dateStr,
                        count: tasks.length,
                        tasks: tasks
                    });
                }
            }
        }
    }
    return fullPlans;
};


export const REAL_PLAN_DATA = {
    "status": 0,
    "message": null,
    "data": {
        "start_date": "2025-11-26",
        "end_date": "2025-12-30",
        "employees": [
            {
                "rtx_id": "yuxuan.cui",
                "name": "崔宇轩",
                "department": "技术中心-国际机票研发-主站与报价-国际主站",
                "count": 10,
                "plans": fillPlans([
                    {
                        "date": "2025-12-09",
                        "count": 1,
                        "tasks": [
                             { "priority": "P3", "name": "FD-379831", "title": "国际乘机人校验规则对齐公共规则 (Long)", "issuetype": "子项目管理", "workhour": "", "job": "coding" }
                        ]
                    },
                    {
                        "date": "2025-12-10",
                        "count": 6,
                        "tasks": [
                            { "priority": "P3", "name": "FD-379831", "title": "国际乘机人校验规则对齐公共规则 (Long)", "issuetype": "子项目管理", "workhour": "", "job": "coding" },
                            { "priority": "P3", "name": "FD-375928", "title": "国际机票中转免费住宿权益数据源构建", "issuetype": "产品需求", "workhour": "", "job": "支持" },
                            { "priority": "P1", "name": "FD-381323", "title": "小红书退改立减", "issuetype": "子项目管理", "workhour": "", "job": "支持" },
                            { "priority": "P3", "name": "FD-377941", "title": "国际乘机人校验规则对齐公共规则", "issuetype": "产品需求", "workhour": "1.0", "job": "coding" }
                        ]
                    },
                    {
                        "date": "2025-12-11",
                        "count": 3,
                        "tasks": [
                            { "priority": "P3", "name": "FD-379831", "title": "国际乘机人校验规则对齐公共规则 (Long)", "issuetype": "子项目管理", "workhour": "", "job": "coding" },
                            { "priority": "P1", "name": "FD-381323", "title": "小红书退改立减", "issuetype": "子项目管理", "workhour": "", "job": "支持" }
                        ]
                    },
                    {
                        "date": "2025-12-12",
                        "count": 1,
                        "tasks": [
                             { "priority": "P3", "name": "FD-379831", "title": "国际乘机人校验规则对齐公共规则 (Long)", "issuetype": "子项目管理", "workhour": "", "job": "coding" }
                        ]
                    }
                ])
            },
            {
                "rtx_id": "houjun.sun",
                "name": "孙厚军",
                "department": "技术中心-国际机票研发-主站与报价-国际主站",
                "count": 7,
                "plans": fillPlans([
                     {
                        "date": "2025-12-10",
                        "count": 3,
                        "tasks": [
                            { "priority": "P1", "name": "FD-363299", "title": "多程航段量提升", "issuetype": "产品需求", "workhour": "0.07", "job": "coding" },
                            { "priority": "P3", "name": "FD-363322", "title": "【故障12305-P3】国际主站、交易问题快速定位", "issuetype": "任务", "workhour": "", "job": "未开始" }
                        ]
                    },
                    {
                        "date": "2025-12-11",
                        "count": 3,
                        "tasks": [
                            { "priority": "P1", "name": "FD-363299", "title": "多程航段量提升", "issuetype": "产品需求", "workhour": "0.07", "job": "coding" }
                        ]
                    }
                ])
            },
            {
                 "rtx_id": "kairong.liu",
                 "name": "刘铠熔",
                 "department": "技术中心-国际机票研发-主站与报价-国际主站",
                 "count": 14,
                 "plans": fillPlans([
                     {
                        "date": "2025-12-10",
                        "count": 3,
                        "tasks": [
                            { "priority": "P3", "name": "FD-381660", "title": "tagger标签优化", "issuetype": "子项目管理", "workhour": "1.0", "job": "coding" },
                            { "priority": "P1", "name": "FD-367492", "title": "国际定价3.0", "issuetype": "产品需求", "workhour": "", "job": "coding" }
                        ]
                     }
                 ])
            },
            {
                 "rtx_id": "geyangz.zhang",
                 "name": "张歌杨z",
                 "department": "技术中心-国际机票研发-主站与报价-国际主站",
                 "count": 6,
                 "plans": fillPlans([
                      {
                        "date": "2025-12-10",
                        "count": 3,
                        "tasks": [
                            { "priority": "P1", "name": "FD-345465", "title": "(国内+国际)机票支付业务直连中台改造", "issuetype": "产品需求", "workhour": "", "job": "coding" },
                            { "priority": "P3", "name": "FD-375522", "title": "自营单坑位支持多报价切换", "issuetype": "产品需求", "workhour": "", "job": "coding" }
                        ]
                      }
                 ])
            },
            {
                "rtx_id": "jike.liang",
                "name": "梁继科",
                "department": "技术中心-国际机票研发-主站与报价-国际主站",
                "count": 5,
                "plans": fillPlans([
                     {
                        "date": "2025-12-10",
                        "count": 3,
                        "tasks": [
                            { "priority": "P3", "name": "FD-380177", "title": "海外站 - 翻译收尾子任务 - 主站", "issuetype": "子项目管理", "workhour": "0.67", "job": "支持" },
                            { "priority": "P3", "name": "FD-381369", "title": "lpg选品露出逻辑修改", "issuetype": "子项目管理", "workhour": "", "job": "coding" }
                        ]
                     }
                ])
            }
        ]
    }
};

export const MOCK_RELATION = REAL_RELATION_DATA.data;
