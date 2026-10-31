import { PrismaClient, UserRole } from '@prisma/client';
import { hashPassword, validatePasswordPolicy } from '../src/utils/password';

const prisma = new PrismaClient();

async function bootstrapAdmin() {
  console.log('=== BRIGHTLOOP ADMIN BOOTSTRAP PROVISIONING ===\n');

  const email = process.env.BOOTSTRAP_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('ERROR: Missing required bootstrap credentials.');
    console.error('Please specify BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD environment variables.');
    console.error('Example:');
    console.error('  $env:BOOTSTRAP_ADMIN_EMAIL="admin@brightloop.io"');
    console.error('  $env:BOOTSTRAP_ADMIN_PASSWORD="SecurePassword123!"');
    console.error('  npx tsx scripts/bootstrap_admin.ts\n');
    process.exit(1);
  }

  const normalizedEmail = email.toLowerCase().trim();

  // 1. Enforce password policy
  const policy = validatePasswordPolicy(password);
  if (!policy.isValid) {
    console.error('ERROR: Admin password does not meet Brightloop security standards:');
    policy.errors.forEach((err) => console.error(` - ${err}`));
    process.exit(1);
  }

  try {
    // 2. Check if an Admin account already exists in the system
    const existingAdmin = await prisma.user.findFirst({
      where: { role: UserRole.ADMIN },
    });

    if (existingAdmin) {
      console.log(`[Bootstrap] An Administrator account already exists: ${existingAdmin.email}`);
      console.log('[Bootstrap] Refusing to overwrite or create duplicate Admin. Aborting safely.');
      process.exit(0);
    }

    // 3. Check if target email is in use by another role
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      console.error(`ERROR: The email '${normalizedEmail}' is already assigned to a non-admin account.`);
      process.exit(1);
    }

    // 4. Hash password with bcrypt cost factor 12
    console.log('[Bootstrap] Hashing password with bcrypt (cost factor 12)...');
    const passwordHash = await hashPassword(password);

    // 5. Create Administrator user and associated executive staff profile
    const adminUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        role: UserRole.ADMIN,
        isActive: true,
        staffProfile: {
          create: {
            department: 'Executive',
            title: 'System Administrator',
          },
        },
      },
      include: {
        staffProfile: true,
      },
    });

    console.log('\nSUCCESS! Administrator account provisioned:');
    console.log(` - ID: ${adminUser.id}`);
    console.log(` - Email: ${adminUser.email}`);
    console.log(` - Role: ${adminUser.role}`);
    console.log(` - Department: ${adminUser.staffProfile?.department}`);
    console.log(` - Created At: ${adminUser.createdAt.toISOString()}`);
    console.log('\nYou can now log in to the Brightloop Admin Portal using these credentials.\n');
  } catch (error: any) {
    console.error('ERROR: Failed to bootstrap administrator:', error.message || error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

bootstrapAdmin();
