const {PrismaClient} = require('@prisma/client')

export class DatabaseConnectionManager {
  static prismaConnection;
  static initConnection() {
    this.prismaConnection = new PrismaClient()
    
  }
}