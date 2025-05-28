import { z } from 'zod';
import { hash } from 'bcryptjs';
import { db } from '~/server/db';
import { users } from '~/server/db/schema';

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, name, password } = registerSchema.parse(body);

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, email),
    });

    if (existingUser) {
      return Response.json(
        { message: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hash(password, 10);

    // Create user
    await db.insert(users).values({
      email,
      name,
      password: hashedPassword,
      onboardingCompleted: false,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error instanceof z.ZodError) {
      return Response.json(
        { message: 'Invalid registration data', issues: error.issues },
        { status: 400 }
      );
    }

    return Response.json(
      { message: 'Failed to register user' },
      { status: 500 }
    );
  }
} 