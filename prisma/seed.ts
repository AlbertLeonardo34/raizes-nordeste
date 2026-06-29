import { PrismaClient, Perfil } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Limpa dados existentes (ordem: filhos antes dos pais)
  await prisma.auditoriaAcao.deleteMany();
  await prisma.historicoFidelidade.deleteMany();
  await prisma.fidelidade.deleteMany();
  await prisma.pagamento.deleteMany();
  await prisma.itemPedido.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.movimentacaoEstoque.deleteMany();
  await prisma.estoqueUnidade.deleteMany();
  await prisma.produto.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.unidade.deleteMany();
  await prisma.usuario.deleteMany();

  const senhaHash = await bcrypt.hash('Senha@123', 10);

  // Usuários
  const admin = await prisma.usuario.create({
    data: {
      nome: 'Administrador',
      email: 'admin@raizesnordeste.com',
      senha: senhaHash,
      perfil: Perfil.ADMIN,
    },
  });

  await prisma.usuario.create({
    data: {
      nome: 'Gerente Recife',
      email: 'gerente@raizesnordeste.com',
      senha: senhaHash,
      perfil: Perfil.GERENTE,
    },
  });

  const usuarioCliente = await prisma.usuario.create({
    data: {
      nome: 'Maria da Silva',
      email: 'cliente@exemplo.com',
      senha: senhaHash,
      perfil: Perfil.CLIENTE,
    },
  });

  // Cliente com LGPD e fidelidade
  await prisma.cliente.create({
    data: {
      usuarioId: usuarioCliente.id,
      telefone: '81999999999',
      consentimentoLGPD: true,
      dataConsentimento: new Date(),
      fidelidade: { create: { pontos: 150 } },
    },
  });

  // Unidades
  const unidade1 = await prisma.unidade.create({
    data: {
      nome: 'Raízes do Nordeste - Recife Centro',
      cidade: 'Recife',
      estado: 'PE',
      endereco: 'Rua da Aurora, 100 - Boa Vista',
    },
  });

  const unidade2 = await prisma.unidade.create({
    data: {
      nome: 'Raízes do Nordeste - Fortaleza',
      cidade: 'Fortaleza',
      estado: 'CE',
      endereco: 'Av. Beira Mar, 200 - Meireles',
    },
  });

  // Produtos
  const produtos = await Promise.all([
    prisma.produto.create({ data: { nome: 'Tapioca Simples', descricao: 'Tapioca com manteiga', preco: 12.90, categoria: 'Tapioca' } }),
    prisma.produto.create({ data: { nome: 'Tapioca Recheada Frango', descricao: 'Tapioca com frango desfiado', preco: 22.90, categoria: 'Tapioca' } }),
    prisma.produto.create({ data: { nome: 'Cuscuz com Ovo', descricao: 'Cuscuz nordestino com ovo caipira', preco: 15.90, categoria: 'Prato' } }),
    prisma.produto.create({ data: { nome: 'Bolo de Macaxeira', descricao: 'Bolo caseiro de macaxeira', preco: 8.90, categoria: 'Doce' } }),
    prisma.produto.create({ data: { nome: 'Café Passado', descricao: 'Café coado na hora', preco: 6.00, categoria: 'Bebida' } }),
    prisma.produto.create({ data: { nome: 'Suco de Cajá', descricao: 'Suco natural de cajá', preco: 9.90, categoria: 'Bebida' } }),
    prisma.produto.create({ data: { nome: 'Canjica Junina', descricao: 'Disponível apenas no período junino', preco: 10.90, categoria: 'Sazonal', sazonal: true } }),
  ]);

  // Estoque para cada unidade
  for (const produto of produtos) {
    await prisma.estoqueUnidade.create({
      data: { unidadeId: unidade1.id, produtoId: produto.id, quantidade: 50 },
    });
    await prisma.estoqueUnidade.create({
      data: { unidadeId: unidade2.id, produtoId: produto.id, quantidade: 30 },
    });
  }

  console.log('✅ Seed concluído com sucesso!');
  console.log('');
  console.log('👤 Usuários criados:');
  console.log('  Admin:   admin@raizesnordeste.com  / Senha@123');
  console.log('  Gerente: gerente@raizesnordeste.com / Senha@123');
  console.log('  Cliente: cliente@exemplo.com        / Senha@123');
  console.log('');
  console.log(`🏪 Unidades: ${unidade1.nome}, ${unidade2.nome}`);
  console.log(`🍽️  Produtos: ${produtos.length} criados`);
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
