import dayjs from "dayjs";
import prisma, { Prisma } from "../prisma";

type ProductionByHour = {
    hour:string, 
    done: number, 
    threshold: number,
    totalCapacity: number;
}

const getProdictionByPeriod = async (startDate: string, endDate: string, machineIds: number[]) => {
    const productionRaw = await prisma.$queryRaw<
            { hour: string; done: number }[]
        >`
            SELECT 
            EXTRACT(HOUR FROM oih.read_date) as hour,
            COUNT(*) as done
            FROM "OrderItemHistory" oih
            WHERE oih.machine_id in (${Prisma.join(machineIds)})
            AND oih.read_date between ${startDate}::date and (${endDate}::date + interval '1 day')
            GROUP BY 1
            ORDER BY 1
            `;
        return productionRaw;
}

const getDiffInDays = (startDate: string, endDate: string): number => {
    if (startDate === endDate) return 1;
    return dayjs(endDate).diff(startDate, 'days') + 1;
}

const getProdictionPreviousPeriod = async (startDate: string, endDate: string, machineIds: number[]) => {
    const diffInDays = getDiffInDays(startDate, endDate);
    const start = dayjs(startDate).subtract(diffInDays, 'days').toDate();
    const end = dayjs(endDate).subtract(diffInDays, 'days').toDate();
    const [{ count: totalPreviousPeriod }] = await prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*) as count
        FROM "OrderItemHistory" oih
        WHERE oih.machine_id in (${Prisma.join(machineIds)})
        AND oih.read_date between ${start}::date and (${end}::date + interval '1 day')
    `;
    return totalPreviousPeriod;
}

const aggregateByHour = (productionByMachineMap: Map<number, ProductionByHour[]>) => {
    const accumulated = Array.from(productionByMachineMap.values())
    .flat()
    .reduce((acc, item) => {
        const hour = item.hour;

        if (!acc[hour]) {
        acc[hour] = {
            hour: hour,
            done: 0,
            threshold: item.threshold,
            totalCapacity: item.totalCapacity
        };
        }

        acc[hour].done += item.done;
        acc[hour].threshold = item.threshold;
        acc[hour].totalCapacity = item.totalCapacity
        return acc;
    }, {} as Record<string, ProductionByHour>);

    const resultado = Object.values(accumulated).sort((a, b) => parseInt(a.hour) - parseInt(b.hour));
    return resultado;
}

interface IMachinesInfo {
    id: number;
    capacity: number;
}
const getMachines = async (machineIds: number[], companyId: number) => {
    return await prisma.$queryRaw<IMachinesInfo[]>`
        select id, capacity from "Machine" m where id in (${Prisma.join(machineIds)}) and "companyId" = ${companyId}`;
}

const getMachinesDetailsAndTotals = async (machines: IMachinesInfo[], startDate: string, endDate: string, companyId: number) => {
    let totalCapacity = 0;
    const productionByMachineMap = new Map<number, ProductionByHour[]>()
    for (const machine of machines) {
        const { id, capacity } = machine;
        totalCapacity += capacity;

        // 🔥 Query única agregada (melhor performance)
        const byHour = await prisma.$queryRaw<
            { hour: string, done: number }[]
        >`
            SELECT 
            TO_CHAR(date_trunc('hour', oih.read_date), 'HH24"h"') as hour,
            COUNT(*) as done
            FROM "OrderItemHistory" oih
            WHERE oih.machine_id = ${id}
            AND oih.read_date between ${startDate}::date and (${endDate}::date + interval '1 day')
            and oih.company_id = ${companyId}
            GROUP BY 1
            ORDER BY 1
        `;

        const productionByHourData = byHour.map((row) => ({
            hour: row.hour,
            done: Number(row.done),
            threshold: Number((capacity / byHour.length).toFixed(0)),
            totalCapacity: capacity
        }));
        productionByMachineMap.set(id, productionByHourData)
    }
    return {
        totalCapacity,
        productionByMachineMap
    }
}

const getOrdersInProduction = async (companyId: number) => {
    const [ { count } ] = await prisma.$queryRaw<
        { count: number }[]
    >
    `select count(order_id) as count from "OrderProgress" where 
        company_id = ${companyId}
        and items_started > 0 
        and items_finished < items_started
    `;
    return count;
}

const getEfficiencyAndAggregateProduction = async (productionByMachineMap: Map<number, ProductionByHour[]>, totalCapacity: number, totalCurrentPeriod: number) => {
    const byHour = aggregateByHour(productionByMachineMap)

    const productionByHourData = byHour.map((row) => ({
        hour: row.hour,
        done: Number(row.done),
        threshold: (totalCapacity / byHour.length).toFixed(0),
    }));

    const totalHours = productionByHourData.length;
    const totalTarget = totalHours * totalCapacity / byHour.length;

    const averageEfficency =
    totalTarget > 0 ? totalCurrentPeriod / totalTarget : 0;

    return {
        productionByHourData,
        averageEfficency: Number(averageEfficency.toFixed(2))
    }
}
export async function getProductionMonitoring({
  startDate,
  endDate,
  machineIds,
  companyId,
}: {
  startDate: string;
  endDate: string;
  machineIds: number[];
  companyId: number
}) {
    const machines = await getMachines(machineIds, companyId);
    const currentPeriodProduction = await getProdictionByPeriod(startDate, endDate, machineIds);
    const totalCurrentPeriod = currentPeriodProduction.reduce(
        (acc, curr) => acc + Number(curr.done),
        0
    );
    const totalPreviousPeriod = await getProdictionPreviousPeriod(startDate, endDate, machineIds);
    const { totalCapacity, productionByMachineMap } = await getMachinesDetailsAndTotals(machines, startDate, endDate, companyId)
    const ordersInProduction = await getOrdersInProduction(companyId)
    const { averageEfficency, productionByHourData  } = await getEfficiencyAndAggregateProduction(productionByMachineMap, totalCapacity, totalCurrentPeriod)
    const productionByMachineData = Array.from(productionByMachineMap.entries()).reduce((acc, entry) => {
        const [machineId, machineData] = entry;
        return {
            ...acc,
            [machineId]: machineData
        }
    }, {})
    return {
        totalDoneCurrentPeriod: totalCurrentPeriod,
        totalDonePreviousPeriod: Number(totalPreviousPeriod),
        ordersInProduction: Number(ordersInProduction),
        averageEfficency,
        productionByHourData,
        productionByMachineData
    };
}