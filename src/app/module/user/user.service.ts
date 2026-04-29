/* eslint-disable @typescript-eslint/no-explicit-any */
import status from "http-status";
import { Role, Specialty } from "../../../generated/prisma/client";
import AppError from "../../errorHelpers/AppError";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { ICreateAdminPayload, ICreateDoctorPayload } from "./user.interface";

const createDoctor = async (payload: ICreateDoctorPayload) => {

    const specialties: Specialty[] = [];

    for (const specialtyId of payload.specialties) {
        const specialty = await prisma.specialty.findUnique({
            where: { id: specialtyId }
        });
        if (!specialty) {
            throw new AppError(status.NOT_FOUND, `Specialty with id ${specialtyId} not found`);
        }
        specialties.push(specialty);
    }

    const userExists = await prisma.user.findUnique({
        where: { email: payload.doctor.email }
    });
    if (userExists) {
        throw new AppError(status.CONFLICT, "User with this email already exists");
    }

    const userData = await auth.api.signUpEmail({
        body: {
            email: payload.doctor.email,
            password: payload.password,
            role: Role.DOCTOR,
            name: payload.doctor.name,
            needPasswordChange: true,
        }
    });

    try {
        const result = await prisma.$transaction(async (tx) => {
            // ✅ payload.doctor থেকে শুধু Doctor model এর field নাও
            const { specialties: _, ...doctorFields } = payload.doctor as any;

            const doctorData = await tx.doctor.create({
                data: {
                    userId: userData.user.id,
                    ...doctorFields,  // ✅ clean data
                }
            });

            const doctorSpecialtyData = specialties.map((specialty) => ({
                doctorId: doctorData.id,
                specialtyId: specialty.id,
            }));

            await tx.doctorSpecialty.createMany({
                data: doctorSpecialtyData
            });

            const doctor = await tx.doctor.findUnique({
                where: { id: doctorData.id },
                include: {
                    specialties: { include: { specialty: true } }
                }
            });

            return doctor;
        });

        return result;

    } catch (error) {
        console.error("❌ Transaction failed:", error); // ✅ আসল error দেখাবে

        // ✅ auth user cleanup
        await prisma.user.deleteMany({
            where: { id: userData.user.id }
        }).catch((e) => console.error("Cleanup failed:", e));

        throw error; // ✅ এটা অবশ্যই throw করতে হবে
    }
};

const createAdmin = async (payload: ICreateAdminPayload) => {
    //TODO: Validate who is creating the admin user. Only super admin can create admin user and only super admin can create super admin user but admin user cannot create super admin user

    const userExists = await prisma.user.findUnique({
        where: {
            email: payload.admin.email
        }
    })

    if (userExists) {
        throw new AppError(status.CONFLICT, "User with this email already exists");
    }

    const { admin, role, password } = payload;



    const userData = await auth.api.signUpEmail({
        body: {
            ...admin,
            password,
            role,
            needPasswordChange: true,
        }
    })

    try {
        const adminData = await prisma.admin.create({
            data: {
                userId: userData.user.id,
                ...admin,
            }
        })

        return adminData;


    } catch (error: any) {
        console.log("Error creating admin: ", error);
        await prisma.user.delete({
            where: {
                id: userData.user.id
            }
        })
        throw error;
    }


}

export const UserService = {
    createDoctor,
    createAdmin,
}