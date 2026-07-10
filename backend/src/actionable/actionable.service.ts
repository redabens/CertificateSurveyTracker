import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ActionableService {
  constructor(private readonly prisma: PrismaService) {}

  async getByVessel(vesselId: number): Promise<any[]> {
    const items = await this.prisma.actionableItem.findMany({
      where: { vesselId },
    });
    return items.map((a) => ({
      id: a.id,
      vessel_id: a.vesselId,
      item_id: a.itemId,
      imposed_date: a.imposedDate,
      category: a.category,
      report_number: a.reportNumber,
      due_date: a.dueDate,
      description: a.description,
      status: a.status,
    }));
  }

  async insert(a: any): Promise<number> {
    const item = await this.prisma.actionableItem.create({
      data: {
        vesselId: a.vessel_id,
        imposedDate: a.imposed_date ?? null,
        category: a.category ?? null,
        reportNumber: a.report_number ?? null,
        dueDate: a.due_date ?? null,
        description: a.description,
        status: a.status ?? 'Pending',
      },
    });
    return item.id;
  }

  async updateStatus(id: number, status: string): Promise<void> {
    await this.prisma.actionableItem.update({
      where: { id },
      data: { status },
    });
  }

  async update(id: number, a: any): Promise<void> {
    await this.prisma.actionableItem.update({
      where: { id },
      data: {
        imposedDate: a.imposed_date ?? null,
        category: a.category ?? null,
        reportNumber: a.report_number ?? null,
        dueDate: a.due_date ?? null,
        description: a.description,
      },
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.actionableItem.delete({
      where: { id },
    });
  }
}
