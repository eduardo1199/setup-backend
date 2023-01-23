import { FastifyInstance } from 'fastify';
import dayjs from 'dayjs';

import { z } from 'zod';

import { prisma } from "./lib/prisma";


export async function appRoutes(app: FastifyInstance) {
  app.post('/habits', async (request, response) => {
    const createHabitBody = z.object({
      title: z.string(),
      weekDays: z.array(z.number().min(0).max(6)),
    });

    const { title, weekDays } = createHabitBody.parse(request.body);

    const today = dayjs().startOf('day').toDate();

    await prisma.habit.create({
      data: {
        title,
        created_at: today,
        habitWeekDays: {
          create: weekDays.map(day => {
            return {
              week_day: day
            }
          })
        }
      }
    });
  });

  app.get('/day', async (request, response) => {
    const getDayParams = z.object({
      date: z.coerce.date()
    });

    const { date } = getDayParams.parse(request.query);

    const parseDate = dayjs(date).startOf('day')
    const weekDay = dayjs(parseDate).get('day');

    const possibleHabits = await prisma.habit.findMany({
      where: {
        created_at: {
          lte: date
        },
        habitWeekDays: {
          some: {
            week_day: weekDay
          }
        }
      }
    });

    const day = await prisma.day.findUnique({
      where: {
        date: parseDate.toDate()
      },
      include: {
        dayHabits: true
      }
    });

    const completedHabits = day?.dayHabits.map((dayHabit) => {
      return dayHabit.habit_id
    });

    return {
      possibleHabits,
      completedHabits
    }
  });
}
