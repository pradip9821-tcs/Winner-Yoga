const User = require('../models/user');
const Address = require('../models/address');

/*
 * Function for select address to defualt address.
*/
async function is_select(is_select,user_id) {
    if (is_select === 1) {
        const address = await Address.findOne({ where: { userId: user_id, is_select: 1 } });
        if (address) {
            address.is_select = 0;
            await address.save();
        }
    }
}

/*
 * Get profile for every user.
*/
exports.getProfile = (req, res, next) => {

    // Find user through email.
    User.findOne({ where: { id: req.user_id } })
        .then(async user => {

            // Chech whether user is exist or not.
            if (!user) {
                const error = new Error('User not exists!');
                error.statusCode = 404;
                throw error;
            }

            const payload = { id: user.id, name: user.name, email: user.email }

            // Send customer details.
            return res.status(200).json({ message: 'Fetch customer successfully', data: payload, status: 1 });

        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        });

}


/*
 * Update profile for every user.
*/
exports.updateProfile = (req, res, next) => {
    const postData = req.body;

    // // Find user through email.
    User.findOne({ where: { id: req.user_id } })
        .then(async user => {

            // Chech whether user is exist or not.
            if (!user) {
                const error = new Error('User not exists!');
                error.statusCode = 404;
                throw error;
            }

            // Updata user data if it is change.
            user.name = postData.name || user.name;
            user.email = postData.newEmail || user.email;
            user.picture = postData.picture || user.picture;

            // Save updated customer data to database
            await user.save();

            return res.status(200).json({ message: 'Update customer successfully', user: { id: user.id, name: user.name, email: user.name }, status: 1 });

        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        });

}


/*
 * Add new address for every user.
*/
exports.postAddress = async (req, res, next) => {

    // Create new address in database.
    try {
        const payload = { ...req.body , userId : req.user_id};

        is_select(req.body.is_select, req.user_id);

        const address = await Address.create(payload);

        return res.status(200).json({
            message: 'Address added successfully',
            address: { id: address.id, company: address.company, address: address.address, address_complement: address.address_complement, city: address.city, state: address.state, zip_code: address.zip_code, conutry: address.conutry, is_select: address.is_select },
            status: 1
        });

    }
    catch (err) {
        console.log(err);
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }

}


/*
 * Update exist address for every user.
*/
exports.updateAddress = (req, res, next) => {

    // Find address through address id.
    Address.findOne({ where: { id: req.params.id } })
        .then(async address => {

            // Check whether address is exist or not.
            if (address === null) {
                const error = new Error('Address not found!');
                error.statusCode = 404;
                throw error;
            }

            // Updata address data if it is change. 
            try {

                address.primary_address = req.body.primary_address || address.primary_address;
                address.addition_address_info = req.body.addition_address_info || address.addition_address_info;
                address.address_type = req.body.address_type || address.address_type;
                address.latitude = req.body.latitude || address.latitude;
                address.longitude = req.body.longitude || address.longitude;
                address.is_select = req.body.is_select || address.is_select;

                is_select(req.body.is_select, req.user_id);

                // save updated address.
                await address.save();

                return res.status(200).json({ message: 'Address updated successfully..', address: address, status: 1 });

            }
            catch (err) {
                const error = new Error('Address not updated!');
                error.statusCode = 404;
                throw error;
            }

        }).catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        })
}


/*
 * Delete address for every user.
*/
exports.deleteAddress = (req, res, next) => {

    // Find address through address id.
    Address.findOne({ where: { id: req.params.id } })
        .then(async address => {

            // Check whether address is exist or not.
            if (address === null) {
                const error = new Error('Address not found!');
                error.statusCode = 404;
                throw error;
            }

            // Detele address into database.
            try {

                await address.destroy();

                return res.status(200).json({
                    message: 'Address deleted successfully!',
                    status: 1
                });
            }
            catch (err) {
                const error = new Error('Address not deleted!\n' + err);
                error.statusCode = 400;
                throw error;
            }

        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        });

}


/*
 * Get all addresses for every user.
*/
exports.getAddress = (req, res, next) => {

    // // Find address through user id.
    Address.findAll({ where: { userId: req.user_id } })
        .then(addresses => {

            // Check whether addresses are exist or not.
            if (addresses.length === 0) {
                const error = new Error('Addresses not found!');
                error.statusCode = 404;
                throw error;
            }

            // Send all saved address of user.
            return res.status(200).json({
                message: 'Address Fetched successfully!',
                data: addresses
            });

        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        });

}


