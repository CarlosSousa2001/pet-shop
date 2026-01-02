'use server';
import prisma from '@/lib/prisma';
import { calculatePeriod, formartDateTime } from '@/utils';
import { revalidatePath } from 'next/cache';
import z from 'zod';

const appointmentFormSchema = z.object({
  tutorName: z.string().min(3, 'O nome do tutor é obrigatório'),
  petName: z.string().min(3, 'O nome do pet é obrigatório'),
  phone: z.string().min(11, 'O telefone é obrigatório'),
  description: z.string().min(3, 'A descrição é obrigatória'),
  scheduleAt: z.date(),
  time: z.string().min(1, 'A hora é obrigatória'),
});

type AppointmentData = z.infer<typeof appointmentFormSchema>;

export async function createAppointment(data: AppointmentData) {
  try {
    const parsedData = appointmentFormSchema.parse(data);

    const { scheduleAt } = parsedData;

    const hour = parseInt(formartDateTime(scheduleAt));

    const { isMorning, isAfternoon, isEvening } = calculatePeriod(hour);

    if (!isMorning && !isAfternoon && !isEvening) {
      return {
        success: false,
        message:
          'Agendamentos só podem ser feitos entre 9h às 12h, 13h às 18h e 19h às 21h.',
      };
    }

    const existingAppointments = await prisma.appointment.findFirst({
      where: {
        scheduleAt,
      },
    });

    if (existingAppointments) {
      return {
        success: false,
        message: 'Já existe um agendamento para esse horário.',
      };
    }

    await prisma.appointment.create({
      data: {
        tutorName: parsedData.tutorName,
        petName: parsedData.petName,
        phone: parsedData.phone,
        description: parsedData.description,
        scheduleAt: parsedData.scheduleAt,
      },
    });

    revalidatePath('/');

    return {
      success: true,
      message: 'Agendamento criado com sucesso.',
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.log(z.treeifyError(error));
    }
  }
}

export async function updateAppointment(id: string, data: AppointmentData) {
  try {
    const parsedData = appointmentFormSchema.parse(data);

    const { scheduleAt } = parsedData;
    const hour = parseInt(formartDateTime(scheduleAt));

    const { isMorning, isAfternoon, isEvening } = calculatePeriod(hour);

    if (!isMorning && !isAfternoon && !isEvening) {
      return {
        success: false,
        message:
          'Agendamentos só podem ser feitos entre 9h às 12h, 13h às 18h e 19h às 21h.',
      };
    }

    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        scheduleAt,
        id: {
          not: id,
        },
      },
    });

    if (existingAppointment) {
      return {
        success: false,
        message: 'Já existe um agendamento para esse horário.',
      };
    }

    await prisma.appointment.update({
      where: {
        id,
      },
      data: {
        ...parsedData,
      },
    });

    revalidatePath('/');
  } catch (error) {
    const errorZod = '';
    if (error instanceof z.ZodError) {
      console.log(z.treeifyError(error));
    }

    return {
      success: false,
      message: errorZod || 'Erro ao atualizar o agendamento.',
    };
  }
}

export async function deleteAppointment(id: string) {
  try {
    await prisma.appointment.delete({
      where: {
        id,
      },
    });

    revalidatePath('/');
  } catch (error) {
    console.log(error);

    return {
      success: false,
      message: 'Erro ao deletar o agendamento.',
    };
  }
}
